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
import { paneIcon } from "../rex/icons";
import { performJump } from "../rex/jump";
import { hostIcon, statusLook } from "../rex/status";
import { hostDisplayName, sessionKey, shortId, type RexBlock, type RexSession, type RexWindow } from "../rex/types";
import { useRexSnapshot } from "../rex/useSnapshot";
import { useScreenPreview } from "../rex/useScreenPreview";
import { useWorkingFrame } from "../rex/useWorkingFrame";
import { NoSessions, RexNotFound, SnapshotFailed } from "./EmptyStates";
import { HostErrorsSection, RefreshErrorSection, SnapshotWarningsSection } from "./HostErrors";
import { PaneDetail } from "./WindowDetail";
import { blockTitle, hostSuffix, processLabel, sessionTitle, shortPath, windowTitle } from "../rex/labels";

interface Pane {
  session: RexSession;
  window: RexWindow;
  block: RexBlock;
}

function flatten(sessions: RexSession[]): Pane[] {
  const panes: Pane[] = [];
  for (const session of sessions) {
    for (const window of session.windows) {
      for (const block of window.blocks) panes.push({ session, window, block });
    }
  }
  return panes;
}

function paneItemId({ session, block }: Pane): string {
  return `${sessionKey(session)}/${block.blockId}`;
}

export interface PaneListProps {
  /** Show only the panes of this tab (pushed from Search Tabs): the session's `sessionKey` and the tab's ID. */
  sessionKey?: string;
  windowId?: string;
}

export function PaneList({ sessionKey: scope, windowId }: PaneListProps = {}) {
  const { install, snapshot, error, isLoading, revalidate } = useRexSnapshot();
  const { pop } = useNavigation();
  const [showDetail, setShowDetail] = useCachedState("show-pane-detail", true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sessions = useMemo(() => {
    const all = snapshot?.sessions ?? [];
    if (!windowId) return all;
    return all
      .filter((s) => sessionKey(s) === scope)
      .map((s) => ({ ...s, windows: s.windows.filter((w) => w.windowId === windowId) }));
  }, [snapshot, scope, windowId]);
  const hostCount = snapshot?.hosts.length ?? 1;
  const localDevice = snapshot?.localDevice;
  const panes = useMemo(() => flatten(sessions), [sessions]);
  const selected = useMemo(() => panes.find((pane) => paneItemId(pane) === selectedId), [panes, selectedId]);

  const screen = useScreenPreview(install, selected?.session, selected?.block.blockId, snapshot?.fetchedAt, showDetail);
  const frame = useWorkingFrame(
    panes.some((pane) => needsFrames([pane.block])),
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

  const showEmpty = !snapshot || panes.length === 0;

  const scopedWindow = windowId ? sessions[0]?.windows[0] : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && !showEmpty}
      navigationTitle={scopedWindow ? `${sessionTitle(sessions[0])} › ${windowTitle(scopedWindow)}` : undefined}
      searchBarPlaceholder={
        windowId ? "Search panes in this tab" : "Search panes by title, program, directory, agent, or session"
      }
      onSelectionChange={setSelectedId}
      filtering={{ keepSectionOrder: true }}
    >
      {error && !snapshot ? (
        <SnapshotFailed error={error} onRetry={revalidate} />
      ) : snapshot ? (
        <>
          {sessions.map((session) => {
            const count = session.windows.reduce((sum, w) => sum + w.blocks.length, 0);
            const host = hostSuffix(session, hostCount);
            const parts = showsCounts() ? [`${count} ${count === 1 ? "pane" : "panes"}`] : [];
            if (host) parts.unshift(host);
            const subtitle = showsSectionSubtitles() && parts.length ? parts.join(" · ") : undefined;
            return (
              <List.Section key={sessionKey(session)} title={sessionTitle(session)} subtitle={subtitle}>
                {session.windows.flatMap((window) =>
                  window.blocks.map((block) => {
                    const pane = { session, window, block };
                    const isSelected = selected?.session === session && selected.block === block;
                    return (
                      <PaneItem
                        key={block.blockId}
                        id={paneItemId(pane)}
                        install={install}
                        pane={pane}
                        localDevice={localDevice}
                        showDetail={showDetail}
                        screen={isSelected ? screen.screen : undefined}
                        isLoadingScreen={isSelected && screen.isLoading}
                        onToggleDetail={() => setShowDetail((value) => !value)}
                        onRefresh={revalidate}
                        onBack={windowId ? pop : undefined}
                        frame={frame}
                      />
                    );
                  }),
                )}
              </List.Section>
            );
          })}
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

interface PaneItemProps {
  id: string;
  install: RexInstall;
  frame: number;
  onBack?: () => void;
  pane: Pane;
  localDevice?: DeviceIcon;
  showDetail: boolean;
  screen?: string;
  isLoadingScreen: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
}

function PaneItem({
  id,
  install,
  frame,
  onBack,
  pane,
  localDevice,
  showDetail,
  screen,
  isLoadingScreen,
  onToggleDetail,
  onRefresh,
}: PaneItemProps) {
  const { session, window, block } = pane;
  const title = blockTitle(block);
  const tab = windowTitle(window);
  const status = block.status[0];
  const look = status ? statusLook(status) : undefined;
  const focused = window.focusedBlockId === block.blockId;
  const cwd = block.process?.cwd;

  const keywords = new Set<string>([
    session.label,
    window.label,
    shortId(block.blockId),
    shortId(window.windowId),
    shortId(session.sessionId),
    hostDisplayName(session.host),
  ]);
  if (block.title) keywords.add(block.title);
  if (block.process?.name) keywords.add(block.process.name);
  if (cwd) for (const part of cwd.split("/")) if (part) keywords.add(part);
  for (const record of block.status) {
    keywords.add(record.app);
    keywords.add(record.state);
  }

  const icon = paneIcon(block, frame);

  const accessories: List.Item.Accessory[] = [];
  if (look) {
    accessories.push(
      showDetail || !showsStatusText()
        ? { icon: look.icon, tooltip: look.label }
        : {
            tag: { value: look.label, color: look.color },
            icon: look.icon,
            tooltip: look.tooltip,
          },
    );
  }
  if (!showDetail) {
    const program = showsProgram() ? processLabel(block) : undefined;
    if (program) accessories.push({ text: program, icon: Icon.Terminal, tooltip: cwd ? shortPath(cwd) : undefined });
    if (showsHost() && !session.host.thisMachine) {
      accessories.push({ icon: hostIcon(session.host), tooltip: hostDisplayName(session.host) });
    }
  }

  accessories.push(...activityAccessories([block], frame));

  return (
    <List.Item
      id={id}
      title={title}
      subtitle={showsSubtitles() ? tab : undefined}
      keywords={[...keywords]}
      icon={focused ? { value: icon, tooltip: "Focused pane" } : icon}
      accessories={accessories}
      detail={
        <PaneDetail
          session={session}
          window={window}
          block={block}
          screen={screen}
          isLoadingScreen={isLoadingScreen}
          localDevice={localDevice}
        />
      }
      actions={
        <ActionPanel title={`${sessionTitle(session)} › ${tab} › ${title}`}>
          <ActionPanel.Section>
            <Action
              title="Jump to Pane"
              icon={Icon.ArrowRight}
              onAction={() =>
                performJump(
                  install,
                  {
                    host: session.host,
                    sessionId: session.sessionId,
                    windowId: window.windowId,
                    blockId: block.blockId,
                  },
                  title,
                )
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {onBack ? (
              <Action
                title="Back to Tabs"
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
              title="Copy Pane ID"
              content={block.blockId}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Tab ID" content={window.windowId} />
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
