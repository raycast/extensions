import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { JSX } from "react";
import { PICKER_COLUMNS } from "../lib/calendar";
import { gridHold } from "../lib/grid-hold";
import { GO_TO_TODAY } from "../lib/shortcuts";
import { useImageCache } from "../lib/use-image-cache";
import { useThrottledState } from "../lib/use-throttled-state";
import { arrowActions } from "./arrow-actions";

export interface PickerViewProps<T> {
  initial: T;
  /** The value containing today, selected by Go to This Month / Year. */
  current: T;
  /** "Month" or "Year", used in action titles. */
  noun: string;
  /** Keeps every value valid, e.g. within the supported range. */
  normalize: (value: T) => T;
  step: (value: T, delta: number) => T;
  /** Row of a value in the 4 x 3 grid, including its page. */
  rowOf: (value: T) => string;
  /** Cache key of the image showing `value` as selected. */
  idOf: (value: T) => string;
  renderImage: (value: T, dark: boolean) => string;
  /** Called with the chosen value; the caller decides where to navigate next. */
  onPick: (value: T) => void;
  /** Additional actions for the Jump section. */
  jumpActions?: (selected: T, select: (value: T) => void) => JSX.Element;
}

/** A 4 x 3 page of months or years, navigated with the arrow keys like the day calendar. */
export function PickerView<T>(props: PickerViewProps<T>) {
  const { noun, current, step, rowOf, onPick, jumpActions } = props;
  const [selected, update] = useThrottledState(props.initial, props.normalize);
  const imageFor = useImageCache();
  const image = imageFor(props.idOf(selected), (dark) => props.renderImage(selected, dark));
  const select = (value: T) => update(() => value);

  return (
    <Detail
      markdown={`![${noun}s](${image})`}
      // A fixed title for this nested screen; the image shows where the selection is.
      navigationTitle={`Go to ${noun}`}
      actions={
        <ActionPanel>
          <Action title={`Choose ${noun}`} icon={Icon.Checkmark} onAction={() => onPick(selected)} />
          <ActionPanel.Section title="Jump">
            <Action
              title={`Go to This ${noun}`}
              icon={Icon.Undo}
              shortcut={GO_TO_TODAY}
              onAction={() => select(current)}
            />
            {jumpActions?.(selected, select)}
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigate">
            {arrowActions(
              PICKER_COLUMNS,
              {
                left: `Previous ${noun}`,
                right: `Next ${noun}`,
                up: `Back ${PICKER_COLUMNS} ${noun}s`,
                down: `Forward ${PICKER_COLUMNS} ${noun}s`,
              },
              (delta, key) => update((value) => step(value, delta), gridHold(key, rowOf)),
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
