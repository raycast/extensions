import { Color, Icon, List } from "@raycast/api";
import { showsHost, showsIds, showsProgram } from "../rex/detail-level";
import { paneIcon } from "../rex/icons";
import { deviceImage, hostDevice, type DeviceIcon } from "../rex/devices";
import { blockTitle, processLabel, sessionTitle, shortPath, windowTitle } from "../rex/labels";
import { appDisplayName, statusLook } from "../rex/status";
import { focusedBlock, hostDisplayName, shortId, type RexBlock, type RexSession, type RexWindow } from "../rex/types";

/** Fence the terminal screen so Markdown leaves it alone, using a fence longer than any inside it. */
function fenced(screen: string): string {
  const longest = Math.max(3, ...[...screen.matchAll(/`{3,}/g)].map((m) => m[0].length + 1));
  const fence = "`".repeat(longest);
  return `${fence}\n${screen.replace(/\s+$/, "")}\n${fence}`;
}

function screenMarkdown(screen: string | undefined, isLoading: boolean): string {
  if (screen !== undefined) return fenced(screen);
  return isLoading ? "" : "_No screen to show._";
}

function HostRow({ session, localDevice }: { session: RexSession; localDevice?: DeviceIcon }) {
  if (!showsHost()) return null;
  const device = hostDevice(session.host, localDevice);
  return (
    <List.Item.Detail.Metadata.Label title="Host" text={hostDisplayName(session.host)} icon={deviceImage(device)} />
  );
}

function TabRow({ window }: { window: RexWindow }) {
  const title = windowTitle(window);
  return (
    <List.Item.Detail.Metadata.Label
      title="Tab"
      text={window.active ? `${title} · active` : title}
      icon={Icon.AppWindow}
    />
  );
}

function ProgramActivity({ block }: { block: RexBlock }) {
  const status = block.status[0];
  if (!status) return null;
  const look = statusLook(status);
  return (
    <List.Item.Detail.Metadata.TagList title={appDisplayName(status.app)}>
      <List.Item.Detail.Metadata.TagList.Item text={status.state} color={look.color} icon={look.icon} />
      {status.msg ? <List.Item.Detail.Metadata.TagList.Item text={status.msg} /> : null}
    </List.Item.Detail.Metadata.TagList>
  );
}

export interface WindowDetailProps {
  session: RexSession;
  window: RexWindow;
  localDevice?: DeviceIcon;
  /** Screen contents of the focused pane, when loaded. */
  screen?: string;
  isLoadingScreen: boolean;
}

export function WindowDetail({ session, window, screen, isLoadingScreen, localDevice }: WindowDetailProps) {
  const focused = focusedBlock(window);

  return (
    <List.Item.Detail
      isLoading={isLoadingScreen}
      markdown={screenMarkdown(screen, isLoadingScreen)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Session" text={sessionTitle(session)} icon={Icon.Layers} />
          <TabRow window={window} />
          {focused ? (
            <List.Item.Detail.Metadata.Label title="Focused Pane" text={blockTitle(focused)} icon={paneIcon(focused)} />
          ) : null}
          <HostRow session={session} localDevice={localDevice} />
          <List.Item.Detail.Metadata.Separator />
          {window.blocks.map((block) => (
            <PaneRows key={block.blockId} block={block} />
          ))}
          {showsIds() ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Tab ID" text={shortId(window.windowId)} />
              <List.Item.Detail.Metadata.Label title="Session ID" text={shortId(session.sessionId)} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function PaneRows({ block }: { block: RexBlock }) {
  const status = block.status[0];
  const look = status ? statusLook(status) : undefined;
  return (
    <>
      <List.Item.Detail.Metadata.Label
        title={blockTitle(block)}
        text={showsProgram() ? (processLabel(block) ?? "") : ""}
        icon={look ? look.icon : { source: Icon.Terminal, tintColor: Color.SecondaryText }}
      />
      <ProgramActivity block={block} />
    </>
  );
}

export interface PaneDetailProps {
  session: RexSession;
  window: RexWindow;
  block: RexBlock;
  localDevice?: DeviceIcon;
  screen?: string;
  isLoadingScreen: boolean;
}

export function PaneDetail({ session, window, block, screen, isLoadingScreen, localDevice }: PaneDetailProps) {
  const focused = window.focusedBlockId === block.blockId;

  return (
    <List.Item.Detail
      isLoading={isLoadingScreen}
      markdown={screenMarkdown(screen, isLoadingScreen)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Session" text={sessionTitle(session)} icon={Icon.Layers} />
          <TabRow window={window} />
          <List.Item.Detail.Metadata.Label
            title="Pane"
            text={focused ? `${blockTitle(block)} · focused` : blockTitle(block)}
            icon={paneIcon(block)}
          />
          <HostRow session={session} localDevice={localDevice} />
          <List.Item.Detail.Metadata.Separator />
          {showsProgram() && block.process?.name ? (
            <List.Item.Detail.Metadata.Label title="Program" text={block.process.name} icon={Icon.Bolt} />
          ) : null}
          {showsProgram() && block.process?.cwd ? (
            <List.Item.Detail.Metadata.Label title="Directory" text={shortPath(block.process.cwd)} icon={Icon.Folder} />
          ) : null}
          <ProgramActivity block={block} />
          {showsIds() ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Pane ID" text={shortId(block.blockId)} />
              <List.Item.Detail.Metadata.Label title="Tab ID" text={shortId(window.windowId)} />
              <List.Item.Detail.Metadata.Label title="Session ID" text={shortId(session.sessionId)} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
