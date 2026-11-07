import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { NoSessions, RexNotFound, SnapshotFailed } from "./components/EmptyStates";
import { HostErrorsSection, RefreshErrorSection, SnapshotWarningsSection } from "./components/HostErrors";
import { WindowList } from "./components/WindowList";
import { blockTitle, sessionTitle, windowTitle } from "./rex/labels";
import type { RexInstall } from "./rex/cli";
import { showsCounts, showsSectionSubtitles, showsStatusText, showsSubtitles } from "./rex/detail-level";
import { deviceImage, hostDevice, type DeviceIcon } from "./rex/devices";
import { activityAccessories, FRAME_CYCLE, FRAME_CYCLE_MS, needsFrames } from "./rex/activity";
import { performJump } from "./rex/jump";
import { blockStatuses, stateColor, statusLook, summarizeStatuses } from "./rex/status";
import {
  focusedBlock,
  hostDisplayName,
  hostKey,
  sessionKey,
  shortId,
  type RexHost,
  type RexSession,
} from "./rex/types";
import { useRexSnapshot } from "./rex/useSnapshot";
import { useWorkingFrame } from "./rex/useWorkingFrame";

interface HostGroup {
  host: RexHost;
  sessions: RexSession[];
}

/** Sessions grouped by the host they live on, this Mac first, like Rex's sidebar. */
function groupByHost(sessions: RexSession[], hosts: RexHost[]): HostGroup[] {
  const groups: HostGroup[] = [];
  for (const host of hosts) groups.push({ host, sessions: [] });
  for (const session of sessions) {
    let group = groups.find((g) => hostKey(g.host) === hostKey(session.host));
    if (!group) {
      group = { host: session.host, sessions: [] };
      groups.push(group);
    }
    group.sessions.push(session);
  }
  return groups
    .filter((g) => g.sessions.length > 0)
    .sort((a, b) => Number(b.host.thisMachine) - Number(a.host.thisMachine));
}

export default function SearchSessions() {
  const { install, snapshot, error, isLoading, revalidate } = useRexSnapshot();
  const frame = useWorkingFrame(
    (snapshot?.sessions ?? []).some((session) => needsFrames(session.windows.flatMap((w) => w.blocks))),
    FRAME_CYCLE_MS,
    FRAME_CYCLE,
  );

  if (!install) {
    return (
      <List>
        <RexNotFound />
      </List>
    );
  }

  const sessions = snapshot?.sessions ?? [];
  const localDevice = snapshot?.localDevice;
  const groups = groupByHost(sessions, snapshot?.hosts ?? []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Rex sessions">
      {error && !snapshot ? (
        <SnapshotFailed error={error} onRetry={revalidate} />
      ) : snapshot ? (
        <>
          {groups.map((group) => (
            <List.Section
              key={hostKey(group.host)}
              title={hostDisplayName(group.host)}
              subtitle={
                showsSectionSubtitles() && showsCounts()
                  ? `${group.sessions.length} ${group.sessions.length === 1 ? "session" : "sessions"}`
                  : undefined
              }
            >
              {group.sessions.map((session) => (
                <SessionItem
                  key={session.sessionId}
                  install={install}
                  session={session}
                  device={hostDevice(session.host, localDevice)}
                  onRefresh={revalidate}
                  frame={frame}
                />
              ))}
            </List.Section>
          ))}
          <HostErrorsSection errors={snapshot.hostErrors} onRetry={revalidate} />
          <SnapshotWarningsSection warnings={snapshot.warnings} onRetry={revalidate} />
          <RefreshErrorSection error={error} fetchedAt={snapshot.fetchedAt} onRetry={revalidate} />
          {sessions.length === 0 && snapshot.hostErrors.length === 0 && snapshot.warnings.length === 0 && !error ? (
            <NoSessions />
          ) : null}
        </>
      ) : null}
    </List>
  );
}

interface SessionItemProps {
  install: RexInstall;
  frame: number;
  session: RexSession;
  device: DeviceIcon;
  onRefresh: () => void;
}

function SessionItem({ install, session, device, frame, onRefresh }: SessionItemProps) {
  const activeWindow = session.windows.find((w) => w.windowId === session.activeWindowId) ?? session.windows[0];
  const focused = activeWindow ? focusedBlock(activeWindow) : undefined;
  const subtitle = focused ? blockTitle(focused) : activeWindow && windowTitle(activeWindow);
  const blocks = session.windows.flatMap((w) => w.blocks);
  const summary = summarizeStatuses(blockStatuses(blocks));
  const title = sessionTitle(session);

  const keywords = new Set<string>([shortId(session.sessionId), hostDisplayName(session.host)]);
  for (const window of session.windows) {
    keywords.add(window.label);
    for (const block of window.blocks) {
      if (block.title) keywords.add(block.title);
      if (block.process?.name) keywords.add(block.process.name);
      if (block.process?.cwd) for (const part of block.process.cwd.split("/")) if (part) keywords.add(part);
      for (const status of block.status) keywords.add(status.app);
    }
  }

  const accessories: List.Item.Accessory[] = summary
    .slice(0, 2)
    .map(({ state, count }) =>
      showsStatusText()
        ? { tag: { value: `${count} ${state}`, color: stateColor(state) } }
        : { icon: statusLook({ app: "", state }).icon, tooltip: `${count} ${state}` },
    );
  if (showsCounts()) {
    accessories.push({ icon: Icon.AppWindow, text: String(session.windows.length), tooltip: "Tabs" });
    accessories.push({ icon: Icon.Terminal, text: String(blocks.length), tooltip: "Panes" });
  }

  accessories.push(...activityAccessories(blocks, frame));

  return (
    <List.Item
      id={sessionKey(session)}
      title={title}
      subtitle={showsSubtitles() ? subtitle : undefined}
      keywords={[...keywords]}
      icon={{ value: deviceImage(device, Color.PrimaryText), tooltip: hostDisplayName(session.host) }}
      accessories={accessories}
      actions={
        <ActionPanel title={`${title} · ${hostDisplayName(session.host)}`}>
          <ActionPanel.Section>
            {activeWindow ? (
              <Action
                title="Jump to Session"
                icon={Icon.ArrowRight}
                onAction={() =>
                  performJump(
                    install,
                    {
                      host: session.host,
                      sessionId: session.sessionId,
                      windowId: activeWindow.windowId,
                      blockId: focused?.blockId,
                    },
                    title,
                  )
                }
              />
            ) : null}
            <Action.Push
              title="Show Tabs"
              icon={Icon.AppWindowGrid2x2}
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              target={<WindowList sessionKey={sessionKey(session)} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
            <Action.CopyToClipboard
              title="Copy Session ID"
              content={session.sessionId}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
