import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { getStatus, goTo } from "./api";
import { describe, Direction, nudge, Position } from "./format";
import Move from "./move";

const WIDTH = 20;

function distanceMeter(distance: number) {
  const filled = Math.round((distance / 100) * WIDTH);
  return "▓".repeat(filled) + "░".repeat(WIDTH - filled);
}

function rotationMeter(rotation: number) {
  const marker = Math.round(((rotation + 100) / 200) * WIDTH);
  return Array.from({ length: WIDTH + 1 }, (_, i) => (i === marker ? "●" : i === WIDTH / 2 ? "┃" : "─")).join("");
}

function markdown(position: Position | undefined, isReady: boolean) {
  if (!position) return "# Connecting to your MotionMount…";
  return [
    `# ${describe(position)}`,
    `**Distance** \`wall ${distanceMeter(position.distance)} out\` ${position.distance}`,
    `**Rotation** \`left ${rotationMeter(position.rotation)} right\` ${position.rotation}`,
    isReady ? "Use **⌘ + arrow keys** to move the TV." : "Reading the current position…",
  ].join("\n\n");
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(getStatus, [], {
    failureToastOptions: { title: "Could not read the MotionMount" },
  });
  const [target, setTarget] = useState<Position>();
  const [isMoving, setIsMoving] = useState(false);
  const pending = useRef<Position | undefined>(undefined);
  const sending = useRef(false);
  const position = target ?? data?.position;
  const isReady = target !== undefined || (data !== undefined && !isLoading);

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
      markdown={markdown(position, isReady)}
      actions={
        position &&
        isReady && (
          <ActionPanel>
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
              <Action.Push
                title="Enter Exact Position"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<Move position={position} />}
              />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}
