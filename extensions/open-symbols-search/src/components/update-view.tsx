import { Action, ActionPanel, Detail, Icon, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { getCatalog } from "../lib/data";
import { applyUpdate, LibraryChange } from "../lib/update";
import { runCheck } from "../lib/update-state";

type View =
  | { step: "checking" }
  | { step: "updating"; latest: string }
  | { step: "up-to-date"; ref: string }
  | { step: "no-symbol-changes"; ref: string; latest: string }
  | { step: "updated"; from: string; to: string; changes: LibraryChange[]; total: number }
  | { step: "error"; message: string };

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

function changeTable(changes: LibraryChange[]) {
  const rows = changes.map((c) => {
    const note = c.isNewLibrary ? " (new library)" : c.isRemovedLibrary ? " (removed)" : "";
    return `| ${c.name}${note} | ${c.added.length} | ${c.removed.length} | ${c.modified.length} |`;
  });
  return ["| Library | Added | Removed | Redrawn |", "|---|---:|---:|---:|", ...rows].join("\n");
}

function examples(changes: LibraryChange[]) {
  const added = changes.flatMap((c) => c.added.slice(0, 6).map((n) => `\`${c.id}.${n}\``)).slice(0, 18);
  return added.length ? `\n\n**New, for example:** ${added.join(", ")}` : "";
}

/**
 * Checks for and installs symbol updates. Used by the Check for Symbol Updates
 * command, and pushed from Search Open Symbols (`embedded`) so it still works
 * while that command is switched off, as it is by default.
 */
export function UpdateView({ embedded = false }: { embedded?: boolean }) {
  const [view, setView] = useState<View>({ step: "checking" });

  const run = useCallback(async () => {
    setView({ step: "checking" });
    try {
      const result = await runCheck();
      if (result.status === "up-to-date") return setView({ step: "up-to-date", ref: result.ref });
      if (result.status === "no-symbol-changes") return setView({ step: "no-symbol-changes", ...result });
      // Symbols changed: install straight away.
      setView({ step: "updating", latest: result.latest });
      const index = await applyUpdate(result);
      setView({
        step: "updated",
        from: result.ref,
        to: result.latest,
        changes: result.changes,
        total: index.symbols.length,
      });
    } catch (e) {
      setView({ step: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const catalog = getCatalog();
  let markdown = "";
  switch (view.step) {
    case "checking":
      markdown = "# Checking for symbol updates…\n\nLooking for a newer Open Symbols release on GitHub.";
      break;
    case "updating":
      markdown = `# Updating to ${view.latest}…`;
      break;
    case "up-to-date":
      markdown = `# You're up to date\n\nOpen Symbols **${view.ref}** is the latest release. ${plural(catalog.symbols.length, "symbol")} across ${catalog.libraries.length} libraries.`;
      break;
    case "no-symbol-changes":
      markdown = `# No symbol changes\n\nOpen Symbols **${view.latest}** is out, but none of its symbols changed since **${view.ref}**, so there's nothing to update.`;
      break;
    case "updated": {
      const n = (k: "added" | "removed" | "modified") => view.changes.reduce((sum, c) => sum + c[k].length, 0);
      markdown = [
        `# Updated to ${view.to}`,
        "",
        `${plural(n("added"), "symbol")} added, ${n("removed").toLocaleString()} removed and ${n("modified").toLocaleString()} redrawn since ${view.from}. You now have ${plural(view.total, "symbol")}.`,
        "",
        changeTable(view.changes),
        examples(view.changes),
        "",
        "_New symbols borrow search tags from same-named icons in other libraries._",
      ].join("\n");
      break;
    }
    case "error":
      markdown = `# Couldn't check for updates\n\n${view.message}`;
      break;
  }

  const busy = view.step === "checking" || view.step === "updating";
  const releaseRef = view.step === "updated" ? view.to : view.step === "no-symbol-changes" ? view.latest : catalog.ref;

  return (
    <Detail
      isLoading={busy}
      markdown={markdown}
      // A root command's title is set by Raycast; only set it when pushed.
      navigationTitle={embedded ? "Check for Symbol Updates" : undefined}
      actions={
        <ActionPanel>
          {!embedded && (
            <Action
              title="Search Open Symbols"
              icon={Icon.MagnifyingGlass}
              onAction={async () => {
                try {
                  await launchCommand({ name: "search-open-symbols", type: LaunchType.UserInitiated });
                } catch (e) {
                  await showFailureToast(e, { title: "Couldn't open Search Open Symbols" });
                }
              }}
            />
          )}
          {!busy && <Action title="Check Again" icon={Icon.ArrowClockwise} onAction={run} />}
          <Action.OpenInBrowser
            title="View Release on GitHub"
            url={`https://github.com/OrchardKit/open-symbols/tree/${releaseRef}`}
          />
        </ActionPanel>
      }
    />
  );
}
