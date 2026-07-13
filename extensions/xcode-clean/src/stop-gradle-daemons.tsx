import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { killAllGradleDaemons, listGradleDaemons } from "./lib/gradle";

export default function Command() {
  const [daemons, setDaemons] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setDaemons(null);
    setDaemons(await listGradleDaemons());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function stop() {
    setBusy(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Stopping daemons…",
    });
    try {
      const stopped = await killAllGradleDaemons();
      toast.style = Toast.Style.Success;
      toast.title =
        stopped === 0
          ? "No daemons were running"
          : `Stopped ${stopped} daemon${stopped === 1 ? "" : "s"}`;
      await popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = e instanceof Error ? e.message : String(e);
      setBusy(false);
    }
  }

  const count = daemons?.length ?? 0;

  const md = [
    "# Stop Gradle / Kotlin Daemons",
    "",
    "Sends `pkill` to every running Gradle and Kotlin daemon process. Useful when a stuck daemon is pinning RAM, holding a file lock, or serving stale build state.",
    "",
    "## What will be stopped",
    "",
    "- Every process matching `GradleDaemon` (the JVM Gradle keeps alive between builds)",
    "- Every process matching `KotlinCompileDaemon` (the long-running Kotlin compiler)",
    "",
    "## Currently running",
    "",
    daemons === null
      ? "_counting…_"
      : count === 0
        ? "**No daemons are running.**"
        : daemons
            .map((line) => {
              const parts = line.split(/\s+/);
              const pid = parts[0];
              const cmd = parts.slice(1).join(" ");
              const short = cmd.length > 90 ? cmd.slice(0, 90) + "…" : cmd;
              return `- \`${pid}\` ${short}`;
            })
            .join("\n"),
    "",
    "> Daemons relaunch automatically on the next build that needs them.",
  ].join("\n");

  const actionTitle =
    daemons === null
      ? "Counting…"
      : count === 0
        ? "Nothing to Stop"
        : `Stop ${count} Daemon${count === 1 ? "" : "s"}`;

  return (
    <Detail
      isLoading={daemons === null || busy}
      navigationTitle="Stop Gradle / Kotlin Daemons"
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title={actionTitle}
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            onAction={stop}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refresh}
          />
        </ActionPanel>
      }
    />
  );
}
