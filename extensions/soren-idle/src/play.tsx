import { Alert, Clipboard, confirmAlert, List, showToast, Toast } from "@raycast/api";
import { Fragment, useEffect, useState } from "react";
import { SKILLS, SKILL_BY_ID } from "./engine/data";
import { stopTask } from "./engine/engine";
import { formatBundle, formatDuration } from "./engine/format";
import { dismissHint, nextHint } from "./engine/hints";
import { exportSave, importSave } from "./engine/migrate";
import { replaceState, resetState, takeSaveNotice, update } from "./engine/storage";
import { topItems } from "./engine/away";
import { Report } from "./engine/types";
import { ReadyGame, showReport, TickInfo, useGame } from "./hooks/use-game";
import { baseView, inventoryView, tasksView } from "./screens";
import { Overview } from "./views/overview";

/** The main menu. Pushed screens (see `screens.tsx`) hold the games' other views. */
export default function Command() {
  const game = useGame(onTick);
  const [away, setAway] = useState<Report | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    takeSaveNotice().then((notice) => {
      if (notice)
        showToast({
          style: Toast.Style.Failure,
          title: "Your save could not be read",
          message: `${notice}. A copy was kept and a new game started.`,
        });
    });
  }, []);

  async function onTick({ state, report, seen }: TickInfo) {
    // The first tick covers time spent away, so show it even when it is quiet.
    if (seen && seen.elapsedMs > 60_000) {
      setAway(seen);
      await showToast({
        style: Toast.Style.Success,
        title: `While you were away (${formatDuration(seen.elapsedMs)})`,
        message:
          [
            ...(Object.keys(seen.rare).length ? [`★ ${formatBundle(seen.rare)}`] : []),
            topItems(seen),
            ...seen.levelUps.map((u) => `${SKILL_BY_ID[u.skill].name} ${u.level}`),
          ]
            .filter(Boolean)
            .join(" · ") ||
          seen.stoppedReason ||
          "Nothing happened",
      });
    } else {
      showReport(report);
    }
    const hint = nextHint(state);
    if (hint && !report.levelUps.length && !report.stoppedReason && !report.notices.length) {
      await showToast({ style: Toast.Style.Success, title: "Tip", message: hint.text });
      await update((s) => dismissHint(s, hint.id));
    }
  }

  if (!game.state) return <List isLoading />;
  const ready = game as ReadyGame;
  const { state } = ready;

  // Typing a search looks through every task, item and building from the menu.
  const searching = search.trim().length > 0;

  return (
    <List
      isShowingDetail
      filtering={{ keepSectionOrder: true }}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search tasks, items and buildings"
    >
      {!searching && (
        <Overview
          state={state}
          away={away}
          onDismissAway={() => setAway(null)}
          frame={ready.frame}
          onStop={() => ready.sync(stopTask)}
          onReset={reset}
          onExport={exportToClipboard}
          onImport={importFromClipboard}
          onSettings={(change) => ready.sync(change)}
        />
      )}
      {searching && baseView(ready)}
      {searching && inventoryView(ready)}
      {searching &&
        SKILLS.map((skill) => skill.id)
          .filter((id) => id !== "hydroponics")
          .map((skill) => <Fragment key={skill}>{tasksView(ready, skill)}</Fragment>)}
    </List>
  );

  async function exportToClipboard() {
    await Clipboard.copy(exportSave(state));
    await showToast({ style: Toast.Style.Success, title: "Save copied to clipboard" });
  }

  async function importFromClipboard() {
    const { state: imported, error } = importSave((await Clipboard.readText()) ?? "");
    if (!imported) {
      await showToast({ style: Toast.Style.Failure, title: error ?? "Import failed" });
      return;
    }
    const ok = await confirmAlert({
      title: "Replace your current game?",
      message: "The save on the clipboard overwrites your progress.",
      primaryAction: { title: "Import", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await replaceState(imported);
    await ready.sync();
    await showToast({ style: Toast.Style.Success, title: "Save imported" });
  }

  async function reset() {
    const ok = await confirmAlert({
      title: "Reset your game?",
      message: "This deletes your save and starts over. It cannot be undone.",
      primaryAction: { title: "Reset Game", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await resetState();
    await ready.sync();
  }
}
