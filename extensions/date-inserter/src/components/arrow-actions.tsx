import { Action, Icon } from "@raycast/api";
import { ArrowKey } from "../lib/grid-hold";

export interface ArrowTitles {
  left: string;
  right: string;
  up: string;
  down: string;
}

const ARROWS: { name: keyof ArrowTitles; key: ArrowKey; icon: Icon; step: (columns: number) => number }[] = [
  { name: "left", key: "arrowLeft", icon: Icon.ArrowLeft, step: () => -1 },
  { name: "right", key: "arrowRight", icon: Icon.ArrowRight, step: () => 1 },
  { name: "up", key: "arrowUp", icon: Icon.ArrowUp, step: (columns) => -columns },
  { name: "down", key: "arrowDown", icon: Icon.ArrowDown, step: (columns) => columns },
];

/**
 * Bare arrow-key actions for a grid drawn as an image. Detail views do not
 * handle arrow keys themselves, so these shortcuts reach the extension.
 * Returned as an array because action panels only accept Action elements.
 */
export function arrowActions(columns: number, titles: ArrowTitles, move: (delta: number, key: ArrowKey) => void) {
  return ARROWS.map((arrow) => (
    <Action
      key={arrow.key}
      title={titles[arrow.name]}
      icon={arrow.icon}
      shortcut={{ modifiers: [], key: arrow.key }}
      onAction={() => move(arrow.step(columns), arrow.key)}
    />
  ));
}
