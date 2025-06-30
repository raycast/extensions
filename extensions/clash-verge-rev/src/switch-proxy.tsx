import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getClashApi, formatDelay, getDelayColor } from "./utils/clash-api";
import {
  ProxyItem,
  ProxyGroup,
  PROXY_TYPE_ICONS,
  ClashMode,
  MODE_NAMES,
  MODE_ICONS,
} from "./utils/types";
import { getProxyGroupMemoryManager } from "./utils/memory-manager";

interface ProxyGroupWithProxies extends ProxyGroup {
  proxies: ProxyItem[];
}

export default function SwitchProxy() {
  const [proxyGroups, setProxyGroups] = useState<ProxyGroupWithProxies[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [currentMode, setCurrentMode] = useState<ClashMode>("rule");

  const clashApi = getClashApi();
  const memoryManager = getProxyGroupMemoryManager();

  // Load proxy information
  const loadProxies = async () => {
    try {
      // Get current proxy mode
      const mode = await clashApi.getCurrentMode();
      setCurrentMode(mode);

      const response = await clashApi.getProxies();
      const groups: ProxyGroupWithProxies[] = [];

      Object.entries(response.proxies).forEach(([, proxy]) => {
        // Only process proxy groups (those with 'all' property)
        if ("all" in proxy && proxy.all && Array.isArray(proxy.all)) {
          const group = proxy as ProxyGroup;

          // Get proxy nodes within the group
          const proxies: ProxyItem[] = [];
          group.all.forEach((proxyName) => {
            const proxyItem = response.proxies[proxyName];
            if (proxyItem && !("all" in proxyItem)) {
              proxies.push(proxyItem as ProxyItem);
            }
          });

          groups.push({
            ...group,
            proxies,
          });
        }
      });

      // Filter proxy groups based on mode
      let filteredGroups: ProxyGroupWithProxies[] = [];

      switch (mode) {
        case "direct":
          // Direct mode: don't show any proxy groups
          filteredGroups = [];
          break;
        case "global":
          // Global mode: only show GLOBAL group
          filteredGroups = groups.filter((group) => group.name === "GLOBAL");
          break;
        case "rule":
        default:
          // Rule mode: show all proxy groups
          filteredGroups = groups;
          break;
      }

      // Apply memory sorting: put last selected proxy group first (only in rule mode)
      let sortedGroups = filteredGroups;
      if (mode === "rule") {
        sortedGroups = await memoryManager.getSortedGroups(filteredGroups);
      }

      setProxyGroups(sortedGroups);

      // Logic for selecting proxy group
      if (sortedGroups.length > 0) {
        let targetGroup = "";

        switch (mode) {
          case "direct":
            // Direct mode: clear selection
            targetGroup = "";
            break;
          case "global":
            // Global mode: automatically select GLOBAL group
            targetGroup = "GLOBAL";
            break;
          case "rule":
          default:
            // Rule mode: prioritize remembered proxy group, otherwise select first one
            if (!selectedGroup) {
              const lastSelected = await memoryManager.getLastSelectedGroup();
              targetGroup =
                lastSelected &&
                sortedGroups.find((g) => g.name === lastSelected)
                  ? lastSelected
                  : sortedGroups[0].name;
            } else {
              // Check if currently selected group still exists
              targetGroup = sortedGroups.find((g) => g.name === selectedGroup)
                ? selectedGroup
                : sortedGroups[0].name;
            }
            break;
        }

        setSelectedGroup(targetGroup);
      } else {
        setSelectedGroup("");
      }
    } catch (error) {
      console.error("Failed to load proxy information:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Load failed",
        message:
          error instanceof Error
            ? error.message
            : "Unable to get proxy information",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Switch proxy node
  const switchProxy = async (groupName: string, proxyName: string) => {
    const group = proxyGroups.find((g) => g.name === groupName);
    if (!group) return;

    if (group.now === proxyName) {
      showToast({
        style: Toast.Style.Success,
        title: "Already using this node",
        message: `${groupName} -> ${proxyName}`,
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Switching node...",
      message: `${groupName} -> ${proxyName}`,
    });

    try {
      await clashApi.switchProxy(groupName, proxyName);

      // Save user selection to memory
      await memoryManager.saveSelection(groupName);

      toast.style = Toast.Style.Success;
      toast.title = "Switch successful";
      toast.message = `${groupName} -> ${proxyName}`;

      // Reload proxy information
      await loadProxies();
    } catch (error) {
      console.error("Failed to switch node:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Switch failed";
      toast.message =
        error instanceof Error ? error.message : "Failed to switch proxy node";
    }
  };

  // Test node delay
  const testProxyDelay = async (proxyName: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Testing delay...",
      message: proxyName,
    });

    try {
      const result = await clashApi.testProxyDelay(proxyName);

      toast.style = Toast.Style.Success;
      toast.title = "Delay test completed";
      toast.message = `${proxyName}: ${formatDelay(result.delay)}`;

      // Reload to update delay information
      await loadProxies();
    } catch (error) {
      console.error("Failed to test delay:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Test failed";
      toast.message =
        error instanceof Error ? error.message : "Delay test failed";
    }
  };

  // Batch test delay for all nodes in group
  const testGroupDelay = async (groupName: string) => {
    const group = proxyGroups.find((g) => g.name === groupName);
    if (!group) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Batch testing delay...",
      message: `${groupName} (${group.proxies.length} nodes)`,
    });

    try {
      const proxyNames = group.proxies.map((p) => p.name);
      await clashApi.batchTestDelay(proxyNames);

      toast.style = Toast.Style.Success;
      toast.title = "Batch test completed";
      toast.message = `${groupName} all node delay tests completed`;

      // Reload to update delay information
      await loadProxies();
    } catch (error) {
      console.error("Failed to batch test delay:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Batch test failed";
      toast.message =
        error instanceof Error ? error.message : "Batch delay test failed";
    }
  };

  // Get node delay
  const getProxyDelay = (proxy: ProxyItem): number => {
    if (proxy.history && proxy.history.length > 0) {
      return proxy.history[proxy.history.length - 1].delay;
    }
    return -1;
  };

  // Get node icon
  const getProxyIcon = (proxy: ProxyItem): string => {
    return PROXY_TYPE_ICONS[proxy.type] || "🔗";
  };

  // Handle proxy group selection change
  const handleGroupChange = async (groupName: string) => {
    setSelectedGroup(groupName);
    // Save user selection to memory
    await memoryManager.saveSelection(groupName);
  };

  useEffect(() => {
    loadProxies();
  }, []);

  // Currently selected group
  const currentGroup = proxyGroups.find((g) => g.name === selectedGroup);

  // Render content for different modes
  const renderContent = () => {
    if (currentMode === "direct") {
      return (
        <List.Section title="Direct Mode">
          <List.Item
            title="Currently in direct mode"
            subtitle="All traffic connects directly, no need to select proxy nodes"
            icon={{
              source: MODE_ICONS.direct,
              tintColor: Color.Blue,
            }}
            accessories={[
              {
                text: MODE_NAMES.direct,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadProxies}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      );
    }

    if (currentMode === "global" && proxyGroups.length === 0) {
      return (
        <List.Section title="Global Mode">
          <List.Item
            title="GLOBAL proxy group not found"
            subtitle="Global mode requires GLOBAL proxy group, please check configuration"
            icon={{
              source: Icon.ExclamationMark,
              tintColor: Color.Orange,
            }}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadProxies}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      );
    }

    if (!currentGroup) {
      return (
        <List.Section title="No Available Proxy Groups">
          <List.Item
            title="No available proxy groups found"
            subtitle="Please check Clash configuration or refresh and retry"
            icon={{
              source: Icon.ExclamationMark,
              tintColor: Color.Orange,
            }}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadProxies}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      );
    }

    return (
      <>
        <List.Section title={`${currentGroup.name} - ${currentGroup.type}`}>
          <List.Item
            title={`Current Node: ${currentGroup.now}`}
            subtitle={`Mode: ${MODE_NAMES[currentMode]} | Type: ${currentGroup.type} | Total ${currentGroup.proxies.length} nodes`}
            icon={{
              source: Icon.Dot,
              tintColor: Color.Green,
            }}
            accessories={[
              {
                text: MODE_ICONS[currentMode],
              },
              {
                text: getProxyIcon(
                  currentGroup.proxies.find(
                    (p) => p.name === currentGroup.now,
                  ) || ({ type: "Unknown" } as ProxyItem),
                ),
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Batch Test Delay"
                  icon={Icon.Stopwatch}
                  onAction={() => testGroupDelay(currentGroup.name)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadProxies}
                />
              </ActionPanel>
            }
          />
        </List.Section>

        <List.Section title="Available Nodes">
          {currentGroup.proxies.map((proxy) => {
            const delay = getProxyDelay(proxy);
            const isCurrent = proxy.name === currentGroup.now;

            return (
              <List.Item
                key={proxy.name}
                title={proxy.name}
                subtitle={`Type: ${proxy.type}${proxy.server ? ` | Server: ${proxy.server}` : ""}`}
                icon={{
                  source: isCurrent ? Icon.CheckCircle : Icon.Circle,
                  tintColor: isCurrent ? Color.Green : Color.SecondaryText,
                }}
                accessories={[
                  {
                    text: getProxyIcon(proxy),
                  },
                  {
                    text: `${formatDelay(delay)} ${getDelayColor(delay)}`,
                  },
                  ...(isCurrent
                    ? [{ text: "Current", icon: Icon.Checkmark }]
                    : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={`Switch to ${proxy.name}`}
                      icon={Icon.Switch}
                      onAction={() =>
                        switchProxy(currentGroup.name, proxy.name)
                      }
                    />
                    <Action
                      title="Test Delay"
                      icon={Icon.Stopwatch}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => testProxyDelay(proxy.name)}
                    />
                    <ActionPanel.Section title="Other Actions">
                      <Action
                        title="Batch Test Delay"
                        icon={Icon.Stopwatch}
                        onAction={() => testGroupDelay(currentGroup.name)}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={loadProxies}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      </>
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search proxy nodes..."
      searchBarAccessory={
        proxyGroups.length > 1 ? (
          <List.Dropdown
            tooltip="Select proxy group"
            value={selectedGroup}
            onChange={handleGroupChange}
          >
            {proxyGroups.map((group) => (
              <List.Dropdown.Item
                key={group.name}
                title={`${group.name} (${group.type})`}
                value={group.name}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {renderContent()}
    </List>
  );
}
