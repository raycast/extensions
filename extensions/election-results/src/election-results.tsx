import { Color, getPreferenceValues, Icon, Keyboard, LocalStorage, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  ballotIcon,
  followedElection,
  forgetSnapshot,
  loadSnapshot,
  phaseOf,
  scheduleLines,
  showsVotes,
  statusText,
} from "./election";
import type { ElectionSnapshot } from "./sources/types";

// What we remember between background runs, to notice when something changes.
type SeenState = { reporting: boolean; leader?: string; winner?: string; late?: boolean };

const execFileAsync = promisify(execFile);

async function notify(title: string, message: string) {
  const script = `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)} sound name "Glass"`;
  await execFileAsync("osascript", ["-e", script]);
}

async function announceChanges(snapshot: ElectionSnapshot) {
  const storageKey = `seen:${snapshot.id}`;
  const stored = await LocalStorage.getItem<string>(storageKey);
  const seen: SeenState = stored ? JSON.parse(stored) : { reporting: false };

  const reporting = snapshot.reportingPercent > 0;
  const leader = reporting ? snapshot.candidates[0]?.shortName : undefined;
  const winner = snapshot.candidates.find((candidate) => candidate.elected)?.shortName;
  const late = phaseOf(snapshot) === "late";
  const heading = `${snapshot.flag} ${snapshot.country} election`;

  let message: string | undefined;
  if (winner && winner !== seen.winner) {
    message = `${winner} wins!`;
  } else if (reporting && !seen.reporting) {
    message = `Results are coming in. ${leader} leads.`;
  } else if (leader && seen.leader && leader !== seen.leader) {
    message = `${leader} takes the lead (${snapshot.reportingPercent.toFixed(1)}% counted)`;
  } else if (late && !seen.late) {
    message = "No results yet, 3 hours after the polls closed. Check the TSE site.";
  }

  if (message) {
    try {
      await notify(heading, message);
    } catch (error) {
      // Keep the old state, so the next run tries again. The results still show.
      console.error("Couldn't show the notification", error);
      return;
    }
  }

  await LocalStorage.setItem(storageKey, JSON.stringify({ reporting, leader, winner, late } satisfies SeenState));
}

export default function Command() {
  const { notify: shouldNotify } = getPreferenceValues<Preferences.ElectionResults>();
  const { data, isLoading, error, revalidate } = useCachedPromise(async () => {
    const election = await followedElection();
    if (!election) throw new Error("TSE lists no election");
    const snapshot = await loadSnapshot(election);
    if (shouldNotify) await announceChanges(snapshot);
    return snapshot;
  });

  async function refreshNow() {
    if (data) await forgetSnapshot(data.id);
    revalidate();
  }

  if (!data) {
    return (
      <MenuBarExtra
        icon={{ source: error ? Icon.WifiDisabled : "ballot-empty.svg", tintColor: Color.PrimaryText }}
        tooltip={error ? "Election results offline" : "Loading election results"}
        isLoading={isLoading}
      >
        {error && <MenuBarExtra.Item title={`Couldn't load results: ${error.message}`} />}
      </MenuBarExtra>
    );
  }

  const phase = phaseOf(data);
  const status = statusText(data, phase);

  return (
    <MenuBarExtra icon={ballotIcon(data, phase)} isLoading={isLoading} tooltip={`${data.flag} ${status}`}>
      <MenuBarExtra.Section title={`${data.flag} ${data.country} · ${data.title}`}>
        <MenuBarExtra.Item icon={ballotIcon(data, phase)} title={status} />
        {phase === "late" && (
          <MenuBarExtra.Item
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title="TSE may be delayed. Check its site for news"
            onAction={() => open(data.resultsUrl)}
          />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {data.candidates.map((candidate) => (
          <MenuBarExtra.Item
            key={candidate.name}
            icon={{ source: Icon.Person, tintColor: candidate.color }}
            title={candidate.name}
            subtitle={
              showsVotes(phase)
                ? `${candidate.percent.toFixed(2)}% · ${candidate.votes.toLocaleString("en-US")} votes · ${candidate.party}`
                : candidate.party
            }
            onAction={() => open(data.resultsUrl)}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {scheduleLines(data, phase).map((line) => (
          <MenuBarExtra.Item
            key={line.key}
            icon={line.key === "updated" ? Icon.Clock : Icon.Calendar}
            title={line.title}
          />
        ))}
        {error && <MenuBarExtra.Item icon={Icon.Warning} title={`Last refresh failed: ${error.message}`} />}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh Now"
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refreshNow}
        />
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title="Open TSE Results"
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open(data.resultsUrl)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
