import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Keyboard,
  LaunchType,
  Toast,
  environment,
  launchCommand,
  showInFinder,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import * as path from "node:path";
import { useMemo, useState } from "react";
import { getPreferences } from "./lib/runtime.ts";
import { periodRange, type Period } from "./lib/stats.ts";
import { statusNotes } from "./lib/statusNotes.ts";
import { DOWNLOADS, freePath, posterFilename, renderPosterPng } from "./lib/shareImage.ts";
import { markdownImage } from "./lib/svg.ts";
import { themeFor, tiersFor } from "./lib/theme.ts";
import { useStats } from "./lib/useStats.ts";
import { renderSharePoster, renderWrapped, SHARE_ASPECT, wrappedFacts } from "./lib/wrappedPoster.ts";

const PERIODS: { id: Period; title: string; key: Keyboard.KeyEquivalent }[] = [
  { id: "month", title: "Month", key: "m" },
  { id: "quarter", title: "Quarter", key: "r" },
  { id: "half", title: "Half Year", key: "h" },
  { id: "year", title: "Year", key: "y" },
  { id: "all", title: "All Time", key: "t" },
];

export default function FocusWrapped() {
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const range = useMemo(() => periodRange(period, offset), [period, offset]);
  const { data, isLoading } = useStats(range.from, range.to);
  const prefs = getPreferences();
  const theme = themeFor(environment.appearance);
  const tiers = tiersFor(prefs.leagues);

  const facts = useMemo(
    () => (data ? wrappedFacts(data, range, prefs.weekStartsOn) : null),
    [data, range, prefs.weekStartsOn],
  );
  const poster = facts ? renderWrapped(facts, theme, tiers) : "";

  async function drawShareable(destination: (name: string) => Promise<string> | string) {
    if (!facts) return null;
    const file = await destination(posterFilename(range.label));
    await renderPosterPng(renderSharePoster(facts, tiers), file, SHARE_ASPECT);
    return file;
  }

  async function copyPoster() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Making your recap…" });
    try {
      const file = await drawShareable((name) => path.join(environment.supportPath, name));
      if (!file) return;
      await Clipboard.copy({ file });
      toast.style = Toast.Style.Success;
      toast.title = "Recap copied";
      toast.message = "Paste it anywhere that takes an image";
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not copy the recap" });
    }
  }

  async function savePoster() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Making your recap…" });
    try {
      const file = await drawShareable((name) => freePath(DOWNLOADS, name));
      if (!file) return;
      toast.style = Toast.Style.Success;
      toast.title = "Saved to Downloads";
      toast.message = path.basename(file);
      toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(file) };
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not save the recap" });
    }
  }

  const note = statusNotes(data, isLoading)
    .map((n) => `> ${n.title}. ${n.body}`)
    .join("\n\n");

  const unit = PERIODS.find((p) => p.id === period);
  const steps = period !== "all";

  const markdown = facts ? [markdownImage(`Foqus Recap, ${range.label}`, poster), "", note].join("\n") : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Show League"
            icon={Icon.BarChart}
            onAction={() => launchCommand({ name: "focus-stats", type: LaunchType.UserInitiated })}
          />
          <Action
            title="Copy as Image"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onAction={copyPoster}
          />
          <Action
            title="Save to Downloads"
            icon={Icon.Download}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={savePoster}
          />
          <ActionPanel.Section title="Period">
            {steps && (
              <Action
                title={`Previous ${unit?.title ?? "Period"}`}
                icon={Icon.ChevronLeft}
                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                onAction={() => setOffset((o) => o - 1)}
              />
            )}
            {steps && offset < 0 && (
              <Action
                title={`Next ${unit?.title ?? "Period"}`}
                icon={Icon.ChevronRight}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                onAction={() => setOffset((o) => Math.min(0, o + 1))}
              />
            )}
            {PERIODS.map((p) => (
              <Action
                key={p.id}
                title={p.title}
                icon={p.id === period ? Icon.CheckCircle : Icon.Circle}
                shortcut={{ modifiers: ["cmd"], key: p.key }}
                onAction={() => {
                  setPeriod(p.id);
                  setOffset(0);
                }}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
