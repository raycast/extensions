import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { JSX } from "react";
import { Match } from "../types";
import { isUpcoming, matchTitle, matchUrl } from "../utils";
import MatchLineups from "./lineups";
import MatchStats from "./match_stats";
import MatchSummary from "./match_summary";
import MatchTimeline from "./timeline";

export default function MatchActions({
  match,
  extra,
  current,
}: {
  match: Match;
  extra?: JSX.Element | false;
  /** The view these actions are shown in, so it isn't offered again. */
  current?: "summary" | "stats";
}) {
  const upcoming = isUpcoming(match);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Match">
        {current !== "summary" && (
          <Action.Push
            title="Match Summary"
            icon={Icon.Sidebar}
            target={<MatchSummary match={match} />}
          />
        )}
        {!upcoming && (
          <Action.Push
            title="Match Timeline"
            icon={Icon.Message}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "t" },
              Windows: { modifiers: ["ctrl"], key: "t" },
            }}
            target={<MatchTimeline match={match} />}
          />
        )}
        <Action.Push
          title="Match Lineups"
          icon={Icon.TwoPeople}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "l" },
            Windows: { modifiers: ["ctrl"], key: "l" },
          }}
          target={<MatchLineups match={match} />}
        />
        {!upcoming && current !== "stats" && (
          <Action.Push
            title="Match Stats"
            icon={Icon.BarChart}
            shortcut={{
              macOS: { modifiers: ["cmd", "opt"], key: "s" },
              Windows: { modifiers: ["ctrl", "alt"], key: "s" },
            }}
            target={<MatchStats match={match} />}
          />
        )}
        <Action.OpenInBrowser url={matchUrl(match)} />
        <Action.CopyToClipboard
          title="Copy Score"
          content={matchTitle(match)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      </ActionPanel.Section>
      {extra}
    </ActionPanel>
  );
}
