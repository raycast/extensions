import { Action, ActionPanel, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import type { RexInstall } from "../rex/cli";
import type { DeviceIcon } from "../rex/devices";
import {
  showsCounts,
  showsHost,
  showsProgram,
  showsSectionSubtitles,
  showsStatusText,
  showsSubtitles,
} from "../rex/detail-level";
import { activityAccessories, FRAME_CYCLE, FRAME_CYCLE_MS, needsFrames } from "../rex/activity";
import { paneIcon, tabIcon } from "../rex/icons";
import { performJump, type JumpTarget } from "../rex/jump";
import { ACCENT, hostIcon, statusLook, windowStatuses } from "../rex/status";
import {
  blockTitle,
  hasAutoLabel,
  hostSuffix,
  processLabel,
  sessionTitle,
  shortPath,
  windowTitle,
} from "../rex/labels";
import { focusedBlock, hostDisplayName, sessionKey, shortId, type RexSession, type RexWindow } from "../rex/types";
import { useRexSnapshot } from "../rex/useSnapshot";
import { useScreenPreview } from "../rex/useScreenPreview";
import { useWorkingFrame } from "../rex/useWorkingFrame";
import { NoSessions, RexNotFound, SnapshotFailed } from "./EmptyStates";
import { HostErrorsSection, RefreshErrorSection, SnapshotWarningsSection } from "./HostErrors";
import { PaneList } from "./PaneList";
import { WindowDetail } from "./WindowDetail";

const ALL_SESSIONS = "all";

export interface WindowListProps {
  /** Show only the tabs of the session with this `sessionKey` (pushed from Search Sessions). */
  sessionKey?: string;
}

interface Located {
  session: RexSession;
  window: RexWindow;
}

function windowItemId(session: RexSession, window: RexWindow): string {
  return `${sessionKey(session)}/${window.windowId}`;
}

function locate(sessions: RexSession[], itemId: string | null): Located | undefined {
  if (!itemId) return undefined;
  for (const session of sessions) {
    const window = session.windows.find((candidate) => windowItemId(session, candidate) === itemId);
    if (window) return { session, window };
  }
  return undefined;
}

export function WindowList({ sessionKey: scope }: WindowListProps) {
  const { install, snapshot, error, isLoading, revalidate } = useRexSnapshot();
  const { pop } = useNavigation();
  const scoped = scope !== undefined;
  const [showDetail, setShowDetail] = useCachedState("show-tab-detail", true);
  const [sessionFilter, setSessionFilter] = useState(scope ?? ALL_SESSIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allSessions = useMemo(() => snapshot?.sessions ?? [], [snapshot]);
  const hostCount = snapshot?.hosts.length ?? 1;
  const localDevice = snapshot?.localDevice;
  const sessions = useMemo(
    () => (sessionFilter === ALL_SESSIONS ? allSessions : allSessions.filter((s) => sessionKey(s) === sessionFilter)),
    [allSessions, sessionFilter],
  );

  const selected = useMemo(() => locate(sessions, selectedId), [sessions, selectedId]);
  const screen = useScreenPreview(
    install,
    selected?.session,
    selected ? focusedBlock(selected.window)?.blockId : undefined,
    snapshot?.fetchedAt,
    showDetail,
  );
  const frame = useWorkingFrame(
    sessions.some((s) => s.windows.some((w) => needsFrames(w.blocks))),
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

  const scopedSession = scoped ? allSessions.find((s) => sessionKey(s) === scope) : undefined;
  const dropdown = scoped ? undefined : (
    <List.Dropdown tooltip="Session" value={sessionFilter} onChange={setSessionFilter}>
      <List.Dropdown.Item title="All Sessions" value={ALL_SESSIONS} icon={Icon.Layers} />
      <List.Dropdown.Section title="Sessions">
        {allSessions.map((session) => {
          const host = hostSuffix(session, hostCount);
          return (
            <List.Dropdown.Item
              key={sessionKey(session)}
              title={host ? `${sessionTitle(session)} · ${host}` : sessionTitle(session)}
              value={sessionKey(session)}
              icon={Icon.Layers}
            />
          );
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  const showEmpty = !snapshot || snapshot.sessions.length === 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && !showEmpty}
      navigationTitle={scopedSession ? sessionTitle(scopedSession) : undefined}
      searchBarPlaceholder={
        scoped ? "Search tabs in this session" : "Search tabs by session, title, program, or directory"
      }
      searchBarAccessory={dropdown}
      onSelectionChange={setSelectedId}
      filtering={{ keepSectionOrder: true }}
    >
      {error && !snapshot ? (
        <SnapshotFailed error={error} onRetry={revalidate} />
      ) : snapshot ? (
        <>
          {sessions.map((session) => (
            <List.Section
              key={sessionKey(session)}
              title={sessionTitle(session)}
              subtitle={showsSectionSubtitles() ? sectionSubtitle(session, hostCount) : undefined}
            >
              {session.windows.map((window) => {
                const isSelected = selected?.session === session && selected.window === window;
                return (
                  <WindowItem
                    key={window.windowId}
                    id={windowItemId(session, window)}
                    install={install}
                    session={session}
                    window={window}
                    localDevice={localDevice}
                    showDetail={showDetail}
                    screen={isSelected ? screen.screen : undefined}
                    isLoadingScreen={isSelected && screen.isLoading}
                    onToggleDetail={() => setShowDetail((value) => !value)}
                    onRefresh={revalidate}
                    onBack={scoped ? pop : undefined}
                    frame={frame}
                  />
                );
              })}
            </List.Section>
          ))}
          <HostErrorsSection errors={snapshot.hostErrors} onRetry={revalidate} />
          <SnapshotWarningsSection warnings={snapshot.warnings} onRetry={revalidate} />
          <RefreshErrorSection error={error} fetchedAt={snapshot.fetchedAt} onRetry={revalidate} />
          {showEmpty && snapshot.hostErrors.length === 0 && snapshot.warnings.length === 0 && !error ? (
            <NoSessions />
          ) : null}
        </>
      ) : null}
    </List>
  );
}

function sectionSubtitle(session: RexSession, hostCount: number): string | undefined {
  const tabs = session.windows.length;
  const panes = session.windows.reduce((sum, window) => sum + window.blocks.length, 0);
  const parts = showsCounts()
    ? [`${tabs} ${tabs === 1 ? "tab" : "tabs"}`, `${panes} ${panes === 1 ? "pane" : "panes"}`]
    : [];
  const host = hostSuffix(session, hostCount);
  if (host) parts.unshift(host);
  return parts.length ? parts.join(" · ") : undefined;
}

interface WindowItemProps {
  id: string;
  install: RexInstall;
  frame: number;
  onBack?: () => void;
  session: RexSession;
  window: RexWindow;
  localDevice?: DeviceIcon;
  showDetail: boolean;
  screen?: string;
  isLoadingScreen: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
}

function WindowItem({
  id,
  install,
  frame,
  onBack,
  session,
  window,
  localDevice,
  showDetail,
  screen,
  isLoadingScreen,
  onToggleDetail,
  onRefresh,
}: WindowItemProps) {
  const focused = focusedBlock(window);
  const title = windowTitle(window);
  const subtitle = !showsSubtitles() || hasAutoLabel(window) ? undefined : focused ? blockTitle(focused) : undefined;
  const statuses = windowStatuses(window);
  const cwd = focused?.process?.cwd;

  const keywords = new Set<string>([
    session.label,
    window.label,
    shortId(window.windowId),
    shortId(session.sessionId),
    hostDisplayName(session.host),
  ]);
  for (const block of window.blocks) {
    if (block.title) keywords.add(block.title);
    if (block.process?.name) keywords.add(block.process.name);
    if (block.process?.cwd) for (const part of block.process.cwd.split("/")) if (part) keywords.add(part);
    for (const status of block.status) {
      keywords.add(status.app);
      keywords.add(status.state);
    }
  }

  const accessories: List.Item.Accessory[] = [];
  if (window.active) accessories.push({ icon: { source: Icon.Dot, tintColor: ACCENT }, tooltip: "Active tab" });
  if (showDetail || !showsStatusText()) {
    for (const status of statuses.slice(0, 3)) {
      const look = statusLook(status);
      accessories.push({ icon: look.icon, tooltip: look.label });
    }
  } else {
    for (const status of statuses.slice(0, 2)) {
      const look = statusLook(status);
      accessories.push({
        tag: { value: look.label, color: look.color },
        icon: look.icon,
        tooltip: look.tooltip,
      });
    }
  }
  if (!showDetail) {
    const program = focused && showsProgram() ? processLabel(focused) : undefined;
    if (program) accessories.push({ text: program, icon: Icon.Terminal, tooltip: cwd ? shortPath(cwd) : undefined });
    if (showsCounts() && window.blocks.length > 1) {
      accessories.push({
        text: String(window.blocks.length),
        icon: Icon.AppWindowGrid2x2,
        tooltip: `${window.blocks.length} panes`,
      });
    }
    if (showsHost() && !session.host.thisMachine) {
      accessories.push({ icon: hostIcon(session.host), tooltip: hostDisplayName(session.host) });
    }
  }

  accessories.push(...activityAccessories(window.blocks, frame));

  const icon = tabIcon(window, frame);

  const target = (blockId?: string): JumpTarget => ({
    host: session.host,
    sessionId: session.sessionId,
    windowId: window.windowId,
    blockId,
  });

  return (
    <List.Item
      id={id}
      title={title}
      subtitle={subtitle}
      keywords={[...keywords]}
      icon={window.active ? { value: icon, tooltip: "Active tab" } : icon}
      accessories={accessories}
      detail={
        <WindowDetail
          session={session}
          window={window}
          screen={screen}
          isLoadingScreen={isLoadingScreen}
          localDevice={localDevice}
        />
      }
      actions={
        <ActionPanel title={`${sessionTitle(session)} › ${title}`}>
          <ActionPanel.Section>
            <Action
              title="Jump to Tab"
              icon={Icon.ArrowRight}
              onAction={() => performJump(install, target(focused?.blockId), title)}
            />
            <Action.Push
              title="Show Panes"
              icon={Icon.AppWindowGrid2x2}
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              target={<PaneList sessionKey={sessionKey(session)} windowId={window.windowId} />}
            />
            {window.blocks.length > 1 ? (
              <ActionPanel.Submenu
                title="Jump to Pane"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd"], key: "j" }}
              >
                {window.blocks.map((block) => {
                  return (
                    <Action
                      key={block.blockId}
                      title={blockTitle(block)}
                      icon={paneIcon(block, frame)}
                      onAction={() => performJump(install, target(block.blockId), blockTitle(block))}
                    />
                  );
                })}
              </ActionPanel.Submenu>
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {onBack ? (
              <Action
                title="Back to Sessions"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                onAction={onBack}
              />
            ) : null}
            <Action
              title={showDetail ? "Hide Terminal Preview" : "Show Terminal Preview"}
              icon={Icon.AppWindowSidebarRight}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={onToggleDetail}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {screen ? (
              <Action.CopyToClipboard
                title="Copy Terminal Screen"
                content={screen}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
              />
            ) : null}
            {cwd ? (
              <Action.CopyToClipboard
                title="Copy Working Directory"
                content={cwd}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Tab ID"
              content={window.windowId}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy Session ID"
              content={session.sessionId}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
