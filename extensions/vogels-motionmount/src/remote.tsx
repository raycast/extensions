import { Action, ActionPanel, Detail, environment, Icon, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { forgetMount, getStatus, goTo } from "./api";
import { Connection, connection } from "./connection";
import { connectionColor } from "./connection-color";
import { describe, Direction, nudge, Position } from "./format";
import { illustration, svgMarkdown } from "./illustration";
import Move from "./move";

function markdown(position: Position | undefined, status: Connection) {
  if (status.state === "failed") return `## Can't reach your MotionMount\n\n${status.message}`;
  if (!position) return "Connecting to your MotionMount…";
  return svgMarkdown(illustration(position, environment.appearance));
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(getStatus, [], {
    failureToastOptions: { title: "Could not read the MotionMount" },
  });
  const [target, setTarget] = useState<Position>();
  const [isMoving, setIsMoving] = useState(false);
  const pending = useRef<Position | undefined>(undefined);
  const sending = useRef(false);
  const position = target ?? data?.position;
  const status = connection({ isLoading, error });
  const isReady = target !== undefined || (data !== undefined && status.state === "connected");

  async function send(next: Position) {
    pending.current = next;
    if (sending.current) return;
    sending.current = true;
    setIsMoving(true);
    while (pending.current) {
      const current = pending.current;
      pending.current = undefined;
      try {
        await goTo(current);
      } catch (error) {
        pending.current = undefined;
        setTarget(undefined);
        revalidate();
        await showFailureToast(error, { title: "Could not move the MotionMount" });
      }
    }
    sending.current = false;
    setIsMoving(false);
  }

  function move(direction: Direction) {
    if (!position || !isReady) return;
    const next = nudge(position, direction);
    setTarget(next);
    send(next);
  }

  function moveToWall() {
    const wall = { distance: 0, rotation: 0 };
    setTarget(wall);
    send(wall);
  }

  return (
    <Detail
      isLoading={isLoading || isMoving}
      markdown={markdown(position, status)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={status.title}
            icon={{ source: Icon.CircleFilled, tintColor: connectionColor[status.state] }}
          />
          {position && <Detail.Metadata.Label title="Position" text={describe(position)} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Extend · Retract" text="⌘↑  ⌘↓" />
          <Detail.Metadata.Label title="Turn Left · Right" text="⌘←  ⌘→" />
          <Detail.Metadata.Label title="Move to Wall" text="⌘⇧W" />
          <Detail.Metadata.Label title="Exact Position" text="↵" />
        </Detail.Metadata>
      }
      actions={
        status.state === "failed" && target === undefined ? (
          <ActionPanel>
            <Action title="Try Again" icon={Icon.RotateClockwise} onAction={revalidate} />
            <Action
              title="Forget Saved MotionMount"
              icon={Icon.Trash}
              onAction={async () => {
                await forgetMount();
                revalidate();
              }}
            />
          </ActionPanel>
        ) : (
          position &&
          isReady && (
            <ActionPanel>
              <Action.Push
                title="Enter Exact Position"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<Move position={position} />}
              />
              <ActionPanel.Section>
                <Action
                  title="Extend"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                  onAction={() => move("extend")}
                />
                <Action
                  title="Retract"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                  onAction={() => move("retract")}
                />
                <Action
                  title="Turn Left"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                  onAction={() => move("left")}
                />
                <Action
                  title="Turn Right"
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                  onAction={() => move("right")}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Move to Wall"
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                  onAction={moveToWall}
                />
              </ActionPanel.Section>
            </ActionPanel>
          )
        )
      }
    />
  );
}
