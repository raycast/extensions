import {
  Clipboard,
  Icon,
  Image,
  Keyboard,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { checkIcon, entryIcon, entryStatusText } from "./components/presentation";
import { MergeQueueLaunchContext, requestRerunFailed, useMergeQueue, useSelection } from "./data";
import { formatAgo, formatSeconds, truncate } from "./lib/format";
import { errorIcon } from "./components/ErrorView";
import { runInTerminal } from "./components/terminal";
import { describeError } from "./lib/errors";
import { failingRunIds, Health, QueueEntry, QueueSnapshot } from "./lib/queue";

const SEVERITY: Health[] = ["failing", "conflict", "running", "queued", "merging", "passing"];
const SHOWS_ETA: Health[] = ["running", "queued", "passing"];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function openInRaycast(context: MergeQueueLaunchContext = {}) {
  try {
    await launchCommand({ name: "merge-queue", type: LaunchType.UserInitiated, context });
  } catch (error) {
    await showHUD(`Couldn't open Merge Queue: ${errorMessage(error)}`);
  }
}

async function rerunFromMenu(entry: QueueEntry) {
  try {
    await requestRerunFailed(failingRunIds(entry));
    await showHUD(`Rerunning failed jobs for #${entry.pr.number}`);
  } catch (error) {
    await showHUD(`Couldn't rerun: ${describeError(error).title}`);
  }
}

function worstOf(entries: QueueEntry[]): QueueEntry | undefined {
  return [...entries].sort((a, b) => SEVERITY.indexOf(a.health) - SEVERITY.indexOf(b.health))[0];
}

function menuBarTitle(mine: QueueEntry[]): string | undefined {
  const first = mine[0];
  if (!first) {
    return undefined;
  }
  const extra = mine.length > 1 ? ` +${mine.length - 1}` : "";
  const eta =
    first.etaSeconds !== undefined && SHOWS_ETA.includes(first.health) ? ` · ${formatSeconds(first.etaSeconds)}` : "";
  return `#${first.position}${extra}${eta}`;
}

function menuBarIcon(mine: QueueEntry[]): Image.ImageLike {
  const worst = worstOf(mine);
  return worst ? entryIcon(worst) : Icon.BulletPoints;
}

function tooltip(snapshot?: QueueSnapshot): string {
  if (!snapshot) {
    return "Merge Queue";
  }
  const attention = snapshot.entries.filter((entry) => entry.health === "failing" || entry.health === "conflict");
  return `${snapshot.entries.length} in the ${snapshot.branch} merge queue${attention.length ? `, ${attention.length} need attention` : ""}`;
}

function EntrySubmenu(props: { entry: QueueEntry; highlightMine: boolean }) {
  const { entry, highlightMine } = props;
  const failing = [...entry.failingRequired, ...entry.failingOptional];
  const byline = [
    entry.pr.author,
    entry.enqueuer && entry.enqueuer !== entry.pr.author ? `queued by ${entry.enqueuer}` : undefined,
    formatAgo(entry.enqueuedAt),
  ]
    .filter(Boolean)
    .join(" · ");
  const title = `${entry.position}. ${truncate(entry.pr.title, 56)}${highlightMine && entry.isMine ? "  ← you" : ""}`;

  return (
    <MenuBarExtra.Submenu icon={entryIcon(entry)} title={title}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={`#${entry.pr.number} · ${entryStatusText(entry)}`} icon={entryIcon(entry)} />
        {entry.etaSeconds !== undefined ? (
          <MenuBarExtra.Item title={`Merges in about ${formatSeconds(entry.etaSeconds)}`} icon={Icon.Clock} />
        ) : null}
        <MenuBarExtra.Item title={byline} icon={Icon.Person} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Pull Request" icon={Icon.Globe} onAction={() => open(entry.pr.url)} />
        <MenuBarExtra.Item
          title="Show Checks in Raycast"
          icon={Icon.List}
          onAction={() => openInRaycast({ prNumber: entry.pr.number, view: "checks" })}
        />
      </MenuBarExtra.Section>
      {failing.length > 0 ? (
        <MenuBarExtra.Section title="Failing Checks">
          {failing.map((check) => (
            <MenuBarExtra.Item
              key={`${check.workflow ?? ""}/${check.name}`}
              title={check.name}
              subtitle={check.required ? "required" : "optional"}
              icon={checkIcon(check)}
              onAction={check.url ? () => open(check.url as string) : undefined}
            />
          ))}
          {failingRunIds(entry).length > 0 ? (
            <MenuBarExtra.Item
              title="Rerun Failed Jobs"
              icon={Icon.ArrowClockwise}
              onAction={() => rerunFromMenu(entry)}
            />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra.Submenu>
  );
}

export default function Command() {
  const { selection, isLoading: selectionLoading } = useSelection();
  const { data, error, isLoading, revalidate } = useMergeQueue(selection);
  const mine = data?.entries.filter((entry) => entry.isMine) ?? [];
  const advice = error ? describeError(error) : undefined;

  if (!selection) {
    return (
      <MenuBarExtra icon={Icon.BulletPoints} tooltip="Merge Queue" isLoading={selectionLoading}>
        {selectionLoading ? null : (
          <MenuBarExtra.Item
            title="Choose a Repository…"
            icon={Icon.MagnifyingGlass}
            onAction={() => openInRaycast()}
          />
        )}
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      icon={advice && !data ? { source: errorIcon(advice) } : menuBarIcon(mine)}
      title={menuBarTitle(mine)}
      tooltip={tooltip(data)}
      isLoading={isLoading}
    >
      {advice && !data ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={advice.title} tooltip={advice.description} icon={errorIcon(advice)} />
          {advice.canSwitch ? (
            <MenuBarExtra.Item
              title="Choose Another Repository…"
              icon={Icon.Switch}
              onAction={() => openInRaycast({ view: "repositories" })}
            />
          ) : null}
          {advice.url ? (
            <MenuBarExtra.Item
              title="Authorize on GitHub"
              icon={Icon.Key}
              onAction={() => open(advice.url as string)}
            />
          ) : null}
          {advice.command && advice.kind !== "not-found" ? (
            <MenuBarExtra.Item
              title={advice.kind === "missing" ? "Install GitHub CLI in Terminal" : "Open Terminal to Sign in"}
              icon={Icon.Terminal}
              onAction={() => runInTerminal(advice.command as string)}
            />
          ) : null}
          {advice.command ? (
            <MenuBarExtra.Item
              title={advice.kind === "not-found" ? "Copy Status Command" : "Copy Command"}
              subtitle={advice.command}
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(advice.command as string);
                await showHUD("Copied. Run it in a terminal.");
              }}
            />
          ) : null}
          {advice.kind === "missing" ? (
            <MenuBarExtra.Item
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}
      {mine.length > 0 ? (
        <MenuBarExtra.Section title="Your Pull Requests">
          {mine.map((entry) => (
            <EntrySubmenu key={entry.id} entry={entry} highlightMine={false} />
          ))}
        </MenuBarExtra.Section>
      ) : null}
      {data ? (
        <MenuBarExtra.Section title={`${data.repo} · ${data.entries.length} queued`}>
          {data.entries.length === 0 ? <MenuBarExtra.Item title="The merge queue is empty" /> : null}
          {data.entries.map((entry) => (
            <EntrySubmenu key={entry.id} entry={entry} highlightMine />
          ))}
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open in Raycast"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() => openInRaycast()}
        />
        {data ? (
          <MenuBarExtra.Item
            title="Open Merge Queue on GitHub"
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => open(data.url)}
          />
        ) : null}
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        {data ? (
          <MenuBarExtra.Item
            title={`Updated ${formatAgo(data.fetchedAt)}`}
            subtitle={advice ? `couldn't refresh: ${advice.title}` : undefined}
            icon={advice ? errorIcon(advice) : undefined}
            tooltip={advice?.description}
          />
        ) : null}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
