import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  environment,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { join } from "node:path";
import { useRef, useState } from "react";
import { BUILTIN_ADAPTERS, Adapter } from "../core/adapters";
import { applyPlan, installCli, resolveNode } from "../core/install";
import { installCollector } from "../core/service";
import { CLI_PATH } from "../core/paths";
import { extensionConfig } from "../lib/env";
import { agentIcon } from "./icons";

type Tag = { value: string; color: Color.ColorLike };

/** Connect supported agents directly; detailed hook plans remain an implementation concern. */
export function AgentSetup() {
  extensionConfig();
  const [installing, setInstalling] = useState<string | null>(null);
  const busy = useRef(false);
  const { data, isLoading, revalidate } = useCachedPromise(async () =>
    BUILTIN_ADAPTERS.map((adapter) => ({ id: adapter.id, detect: adapter.detect() })),
  );

  async function install(adapter: Adapter) {
    if (busy.current) return;
    busy.current = true;
    setInstalling(adapter.id);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting " + adapter.name });
    try {
      const node = await resolveNode();
      if (!node) throw new Error("Node.js was not found. Hooks need it to run.");
      const plan = adapter.planInstall({ node, cli: CLI_PATH });
      installCli(join(environment.assetsPath, "agent-inbox.mjs"));
      applyPlan(plan);
      await installCollector(node);
      if (!adapter.detect().hooked) throw new Error("Connection could not be verified. Try again.");
      await revalidate();
      toast.style = Toast.Style.Success;
      toast.title = adapter.name + " connected";
      // Codex's own one-time approval is still needed for the running-state hook.
      toast.message =
        adapter.id === "codex" ? "Codex asks you to approve new hooks once: run /hooks inside Codex." : undefined;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Connection failed";
      toast.message = String((error as Error).message ?? error);
    } finally {
      busy.current = false;
      setInstalling(null);
    }
  }

  const tagFor = (id: string, d: { present: boolean; hooked: boolean }): Tag =>
    installing === id
      ? { value: "Connecting", color: Color.Blue }
      : d.hooked
        ? { value: "Installed", color: Color.Green }
        : d.present
          ? { value: "Not Connected", color: Color.Blue }
          : { value: "Not found", color: Color.SecondaryText };

  return (
    <List
      isLoading={isLoading || installing !== null}
      navigationTitle="Connect an Agent"
      searchBarPlaceholder="Search agents"
    >
      {(data ?? []).map(({ id, detect }) => {
        const adapter = BUILTIN_ADAPTERS.find((item) => item.id === id);
        if (!adapter) return null;
        return (
          <List.Item
            key={adapter.id}
            icon={agentIcon(adapter.id)}
            title={adapter.name}
            subtitle="CLI · Desktop"
            accessories={[{ tag: tagFor(adapter.id, detect) }]}
            actions={
              <ActionPanel>
                <Action
                  title={detect.hooked ? "Reconnect" : "Connect"}
                  icon={Icon.Plug}
                  onAction={() => install(adapter)}
                />
                {detect.hooked && <UninstallAction adapter={adapter} onDone={revalidate} isBusy={() => busy.current} />}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function UninstallAction({ adapter, onDone, isBusy }: { adapter: Adapter; onDone: () => void; isBusy: () => boolean }) {
  return (
    <Action
      title="Remove Hooks"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        if (isBusy()) return;
        try {
          const ok = await confirmAlert({
            title: "Remove Hooks",
            message: "Only the entries written by this extension are removed.",
            primaryAction: { title: "Remove Hooks", style: Alert.ActionStyle.Destructive },
            dismissAction: { title: "Cancel" },
          });
          if (!ok) return;
          applyPlan(adapter.planUninstall());
          await showToast({ style: Toast.Style.Success, title: "Hooks removed for " + adapter.name });
          onDone();
        } catch (error) {
          await showFailureToast(error, { title: "Removal failed" });
        }
      }}
    />
  );
}
