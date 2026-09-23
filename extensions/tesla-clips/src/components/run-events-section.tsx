/**
 * Shared "Events" section for run-completion lists.
 *
 * @module components/run-events-section
 */

import type { ReactElement } from "react";
import { List } from "@raycast/api";
import type { TeslaEvent } from "../types";

/** Props for {@link RunEventsSection}. */
type RunEventsSectionProps = {
  readonly events: readonly TeslaEvent[];
  readonly renderEventRow: (event: TeslaEvent) => ReactElement;
};

/**
 * Renders the "Events" section on a run-completion screen, delegating each row to `renderEventRow`.
 *
 * Shared by {@link CleanupRunView} and {@link MergeRunView} completion views.
 *
 * @param props - Completed events and a per-event row renderer.
 * @returns Raycast `List.Section` with a pluralized event-count subtitle.
 */
export function RunEventsSection({ events, renderEventRow }: RunEventsSectionProps) {
  return (
    <List.Section title="Events" subtitle={`${events.length} event${events.length !== 1 ? "s" : ""}`}>
      {events.map((event) => renderEventRow(event))}
    </List.Section>
  );
}
