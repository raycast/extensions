import { Action, ActionPanel, Alert, Color, confirmAlert, environment, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { join } from "node:path";
import { useRef, useState } from "react";
import { BUILTIN_ADAPTERS, Adapter } from "../core/adapters";
import { Translator } from "../core/messages";
import { applyPlan, installCli, resolveNode } from "../core/install";
import { installCollector } from "../core/service";
import { CLI_PATH } from "../core/paths";
import { locale } from "../lib/env";
import { agentIcon } from "./icons";

type Tag = { value: string; color: Color.ColorLike };

/** Connect supported agents directly; detailed hook plans remain an implementation concern. */
export function AgentSetup() {
  const { t } = locale();
  const [installing, setInstalling] = useState<string | null>(null);
  const busy = useRef(false);
  const { data, isLoading, revalidate } = useCachedPromise(async () =>
    BUILTIN_ADAPTERS.map((adapter) => ({ adapter, detect: adapter.detect() })),
  );

  async function install(adapter: Adapter) {
    if (busy.current) return;
    busy.current = true;
    setInstalling(adapter.id);
    const toast = await showToast({ style: Toast.Style.Animated, title: t("toast.installing", { name: adapter.name }) });
    try {
      const node = await resolveNode();
      if (!node) throw new Error(t("setup.nodeMissing"));
      const plan = adapter.planInstall({ node, cli: CLI_PATH });
      installCli(join(environment.assetsPath, "agent-inbox.mjs"));
      applyPlan(plan);
      await installCollector(node);
      if (!adapter.detect().hooked) throw new Error(t("setup.installNotDetected"));
      await revalidate();
      toast.style = Toast.Style.Success;
      toast.title = t("toast.installed", { name: adapter.name });
      // Codex's own one-time approval is still needed for the running-state hook.
      toast.message = adapter.id === "codex" ? t("setup.codexHooksNote") : undefined;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = t("toast.installFailed");
      toast.message = String((error as Error).message ?? error);
    } finally {
      busy.current = false;
      setInstalling(null);
    }
  }

  const tagFor = (id: string, d: { present: boolean; hooked: boolean }): Tag =>
    installing === id
      ? { value: t("setup.installing"), color: Color.Blue }
      : d.hooked
        ? { value: t("setup.ready"), color: Color.Green }
        : d.present
          ? { value: t("setup.install"), color: Color.Blue }
          : { value: t("setup.notFound"), color: Color.SecondaryText };

  return (
    <List isLoading={isLoading || installing !== null} navigationTitle={t("nav.setup")}>
      {(data ?? []).map(({ adapter, detect }) => (
        <List.Item
          key={adapter.id}
          icon={agentIcon(adapter.id)}
          title={adapter.name}
          subtitle={t(adapter.id === "claude" ? "setup.claudeHosts" : "setup.codexHosts")}
          accessories={[{ tag: tagFor(adapter.id, detect) }]}
          actions={
            <ActionPanel>
              <Action title={t(detect.hooked ? "action.reinstall" : "action.install")} icon={Icon.Plug} onAction={() => install(adapter)} />
              {detect.hooked && <UninstallAction adapter={adapter} t={t} onDone={revalidate} isBusy={() => busy.current} />}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function UninstallAction({ adapter, t, onDone, isBusy }: { adapter: Adapter; t: Translator; onDone: () => void; isBusy: () => boolean }) {
  return (
    <Action
      title={t("action.uninstall")}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        if (isBusy()) return;
        try {
          const ok = await confirmAlert({
            title: t("action.uninstall"),
            message: t("setup.uninstallIntro"),
            primaryAction: { title: t("action.uninstall"), style: Alert.ActionStyle.Destructive },
            dismissAction: { title: t("confirm.cancel") },
          });
          if (!ok) return;
          applyPlan(adapter.planUninstall());
          await showToast({ style: Toast.Style.Success, title: t("toast.uninstalled", { name: adapter.name }) });
          onDone();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: t("toast.uninstallFailed"),
            message: String((error as Error).message ?? error),
          });
        }
      }}
    />
  );
}
