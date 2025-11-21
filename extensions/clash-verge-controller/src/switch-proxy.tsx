import { Action, ActionPanel, Clipboard, Color, Form, Icon, List, Toast, showHUD, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  ProxyMode,
  ProxyNode,
  fetchMode,
  fetchProviders,
  fetchProxyDetail,
  fetchSelectorGroup,
  getProxyGroup,
  getSpeedTestConfig,
  loadExcludeList,
  refreshProviders,
  runBatchSpeedTest,
  runSpeedTest,
  saveExcludeList,
  switchProxy,
  testConnectivity,
  testDownloadSpeed,
  updateMode,
} from "./clash-verge";

type State = {
  isLoading: boolean;
  nodes: ProxyNode[];
  providers: string[];
  activeNode?: string;
  mode?: ProxyMode;
  excludes: string[];
};

export default function Command() {
  const [state, setState] = useState<State>({
    isLoading: true,
    nodes: [],
    providers: [],
    excludes: [],
  });

  const proxyGroup = getProxyGroup();
  const speedTestConfig = getSpeedTestConfig();

  useEffect(() => {
    reload();
  }, []);

  async function reload() {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const [providerData, selector, mode, excludes] = await Promise.all([
        fetchProviders(),
        fetchSelectorGroup(proxyGroup),
        fetchMode(),
        loadExcludeList(),
      ]);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        nodes: providerData.nodes,
        providers: providerData.providers,
        activeNode: selector?.now,
        mode,
        excludes,
      }));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load Clash Verge data",
        message: String(error),
      });
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  const nodesByProvider = useMemo(() => {
    return state.nodes.reduce<Record<string, ProxyNode[]>>((acc, node) => {
      acc[node.provider] = acc[node.provider] || [];
      acc[node.provider].push(node);
      return acc;
    }, {});
  }, [state.nodes]);

  async function handleSwitch(node: ProxyNode) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Switching proxy...",
      message: node.name,
    });

    try {
      await switchProxy(proxyGroup, node.name);
      toast.style = Toast.Style.Success;
      toast.title = "Proxy switched";
      toast.message = `${proxyGroup} -> ${node.name}`;
      setState((prev) => ({ ...prev, activeNode: node.name }));
      await showHUD(`Switched to ${node.name}`);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to switch";
      toast.message = String(error);
    }
  }

  async function handleSpeedTest(node: ProxyNode) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Testing speed...",
      message: node.name,
    });

    try {
      const delay = await runSpeedTest(node.name, speedTestConfig.url, speedTestConfig.timeout);
      toast.style = Toast.Style.Success;
      toast.title = "Speed test complete";
      toast.message = `${delay} ms`;
      setState((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.name === node.name ? { ...n, lastDelay: delay } : n)),
      }));
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Speed test failed";
      toast.message = String(error);
    }
  }

  async function handleBatchSpeedTest(providerNodes?: ProxyNode[]) {
    const nodesToTest = providerNodes || state.nodes;
    const nodeNames = nodesToTest.map((n) => n.name);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Testing all nodes...",
      message: `0/${nodeNames.length}`,
    });

    try {
      const results = await runBatchSpeedTest(
        nodeNames,
        speedTestConfig.url,
        speedTestConfig.timeout,
        (completed, total) => {
          toast.message = `${completed}/${total}`;
        },
      );

      // Update node delays
      setState((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => {
          const result = results.find((r) => r.name === n.name);
          if (result && result.delay !== null) {
            return { ...n, lastDelay: result.delay };
          }
          return n;
        }),
      }));

      const successful = results.filter((r) => r.delay !== null).length;
      toast.style = Toast.Style.Success;
      toast.title = "Batch speed test complete";
      toast.message = `${successful}/${results.length} nodes tested`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Batch speed test failed";
      toast.message = String(error);
    }
  }

  async function handleConnectivityTest() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Testing connectivity...",
    });

    const result = await testConnectivity();

    if (result.ok) {
      toast.style = Toast.Style.Success;
      toast.title = "Controller connected";
      toast.message = `Latency: ${result.latency}ms`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";
      toast.message = result.message;
    }
  }

  async function handleDownloadSpeedTest(node: ProxyNode) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Testing download speed...",
      message: node.name,
    });

    try {
      const result = await testDownloadSpeed(node.name);
      toast.style = Toast.Style.Success;
      toast.title = "Speed test complete";
      toast.message = `${node.name}: ${result.speedText}`;
      setState((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.name === node.name ? { ...n, downloadSpeed: result.speed, downloadSpeedText: result.speedText } : n,
        ),
      }));
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Speed test failed";
      toast.message = String(error);
    }
  }

  async function handleCopyAddress(node: ProxyNode) {
    let current = node;
    if (!node.server) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching address...",
        message: node.name,
      });
      try {
        const detail = await fetchProxyDetail(node.name);
        current = { ...node, server: detail.server, port: detail.port };
        setState((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) => (n.name === node.name ? current : n)),
        }));
        toast.style = Toast.Style.Success;
        toast.title = "Address loaded";
        toast.message = undefined;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Address unavailable";
        toast.message = String(error);
        return;
      }
    }

    if (!current.server) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No address for node",
        message: node.name,
      });
      return;
    }

    const address = current.port ? `${current.server}:${current.port}` : current.server;
    await Clipboard.copy(address);
    await showHUD(`Copied ${address}`);
  }

  async function handleUpdateProviders() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating subscriptions...",
    });

    try {
      await refreshProviders(state.providers);
      toast.style = Toast.Style.Success;
      toast.title = "Subscriptions updated";
      await reload();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = String(error);
    }
  }

  async function handleModeChange(mode: ProxyMode) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting mode...",
      message: mode,
    });

    try {
      await updateMode(mode);
      toast.style = Toast.Style.Success;
      toast.title = "Mode updated";
      toast.message = mode;
      setState((prev) => ({ ...prev, mode }));
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to set mode";
      toast.message = String(error);
    }
  }

  async function handleExcludeSave(list: string[]) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving excludes...",
    });

    try {
      await saveExcludeList(list);
      toast.style = Toast.Style.Success;
      toast.title = "Excludes saved";
      setState((prev) => ({ ...prev, excludes: list }));
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save excludes";
      toast.message = String(error);
    }
  }

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Search or filter nodes..."
      searchBarAccessory={<ModeAccessory mode={state.mode} onChange={handleModeChange} />}
      throttle
    >
      <List.Section title="Controls">
        <List.Item
          title={`Current Mode: ${state.mode ?? "Unknown"}`}
          subtitle={`Selector Group: ${proxyGroup}`}
          accessories={[{ icon: Icon.RotateClockwise, tooltip: "Update subscriptions" }]}
          actions={
            <ActionPanel>
              <Action title="Test Connectivity" icon={Icon.Link} onAction={handleConnectivityTest} />
              <ActionPanel.Section title="Batch Tests">
                <Action
                  title="Test Latency All Nodes"
                  icon={Icon.Clock}
                  onAction={() => handleBatchSpeedTest()}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                />
              </ActionPanel.Section>
              <Action title="Update Subscriptions" icon={Icon.RotateClockwise} onAction={handleUpdateProviders} />
              <Action
                title="Reload List"
                icon={Icon.ArrowClockwise}
                onAction={reload}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <ModeActions mode={state.mode} onAction={handleModeChange} />
              <Action.Push
                title="Manage Exclude URLs"
                icon={Icon.MinusCircle}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<ExcludeForm initial={state.excludes} onSave={handleExcludeSave} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {Object.entries(nodesByProvider).map(([provider, nodes]) => (
        <List.Section key={provider} title={provider}>
          {nodes.map((node) => {
            const isActive = state.activeNode === node.name;
            const accessories: List.Item.Accessory[] = [{ tag: { value: node.type, color: Color.Blue } }];

            // Show download speed if available
            if (node.downloadSpeedText) {
              accessories.push({
                tag: {
                  value: node.downloadSpeedText,
                  color:
                    node.downloadSpeed && node.downloadSpeed >= 1024
                      ? Color.Green
                      : node.downloadSpeed && node.downloadSpeed >= 512
                        ? Color.Orange
                        : Color.Red,
                },
                tooltip: "Download speed",
              });
            }

            // Show latency with color coding
            if (node.lastDelay !== undefined && node.lastDelay !== null) {
              accessories.push({
                tag: {
                  value: `${node.lastDelay}ms`,
                  color: node.lastDelay < 150 ? Color.Green : node.lastDelay < 350 ? Color.Orange : Color.Red,
                },
                tooltip: "Latency",
              });
            }

            accessories.push({
              icon: isActive ? Icon.Checkmark : Icon.Dot,
              tooltip: isActive ? "Active" : "Inactive",
            });

            // Build subtitle with address only
            const subtitle = node.server ? `${node.server}${node.port ? `:${node.port}` : ""}` : "";

            return (
              <List.Item
                key={`${provider}-${node.name}`}
                title={node.name}
                subtitle={subtitle}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action title="Switch to Node" icon={Icon.Switch} onAction={() => handleSwitch(node)} />
                    <ActionPanel.Section title="Speed Tests">
                      <Action title="Test Latency" icon={Icon.Clock} onAction={() => handleSpeedTest(node)} />
                      <Action
                        title="Test Download Speed"
                        icon={Icon.Download}
                        onAction={() => handleDownloadSpeedTest(node)}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                      <Action
                        title={`Test Latency All in ${provider}`}
                        icon={Icon.Clock}
                        onAction={() => handleBatchSpeedTest(nodes)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                      />
                    </ActionPanel.Section>
                    <Action title="Test Connectivity" icon={Icon.Link} onAction={handleConnectivityTest} />
                    <Action title="Copy Node Address" icon={Icon.Clipboard} onAction={() => handleCopyAddress(node)} />
                    <Action title="Update Subscriptions" icon={Icon.RotateClockwise} onAction={handleUpdateProviders} />
                    <Action
                      title="Reload List"
                      icon={Icon.ArrowClockwise}
                      onAction={reload}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <ModeActions mode={state.mode} onAction={handleModeChange} />
                    <Action.Push
                      title="Manage Exclude URLs"
                      icon={Icon.MinusCircle}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      target={<ExcludeForm initial={state.excludes} onSave={handleExcludeSave} />}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}

      {!state.isLoading && state.nodes.length === 0 ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="No nodes found"
          description="Try updating subscriptions or check the controller URL."
        />
      ) : null}
    </List>
  );
}

function ModeAccessory({ mode, onChange }: { mode?: ProxyMode; onChange: (mode: ProxyMode) => void }) {
  return (
    <List.Dropdown tooltip="Change mode" value={mode} onChange={(value) => onChange(value as ProxyMode)}>
      <List.Dropdown.Item title="Rule" value="Rule" />
      <List.Dropdown.Item title="Global" value="Global" />
      <List.Dropdown.Item title="Direct" value="Direct" />
    </List.Dropdown>
  );
}

function ModeActions({ mode, onAction }: { mode?: ProxyMode; onAction: (mode: ProxyMode) => void }) {
  return (
    <ActionPanel.Section title="Modes">
      <Action
        title="Set Mode: Rule"
        icon={Icon.ArrowsExpand}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={() => onAction("Rule")}
      />
      <Action
        title="Set Mode: Global"
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
        onAction={() => onAction("Global")}
      />
      <Action
        title="Set Mode: Direct"
        icon={Icon.Bolt}
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        onAction={() => onAction("Direct")}
      />
      {mode ? <Action.CopyToClipboard title="Copy Current Mode" content={mode} /> : null}
    </ActionPanel.Section>
  );
}

function ExcludeForm({ initial, onSave }: { initial: string[]; onSave: (list: string[]) => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Excludes"
            icon={Icon.Checkmark}
            onSubmit={async (values: { excludes: string }) => {
              const list = values.excludes
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean);
              await onSave(list);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="excludes"
        title="Exclude URLs / Domains"
        defaultValue={initial.join("\n")}
        placeholder="One entry per line, sent direct"
      />
      <Form.Description text="Exclude list will try to sync to the Clash controller; if unsupported it stays in Raycast local storage." />
    </Form>
  );
}
