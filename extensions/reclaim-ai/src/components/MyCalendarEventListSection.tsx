import type { FC } from "react";
import { Event } from "../types/event";
import { useEventActions } from "../hooks/useEvent";
import { Color, Icon, List } from "@raycast/api";
import { formatDistance } from "date-fns";
import { eventColors } from "../utils/events";
import { MyCalendarEventActionPanel } from "./MyCalendarEventActionPanel";

export type MyCalendarEventListSectionProps = { sectionTitle: string; events: Event[] };

export const MyCalendarEventListSection: FC<MyCalendarEventListSectionProps> = ({ sectionTitle, events }) => {
  /********************/
  /*   custom hooks   */
  /********************/

  const { showFormattedEventTitle } = useEventActions();

  const now = new Date();

  /********************/
  /*     useState     */
  /********************/

  /********************/
  /* useMemo & consts */
  /********************/

  /********************/
  /*    useCallback   */
  /********************/

  /********************/
  /*    useEffects    */
  /********************/

  /********************/
  /*       JSX        */
  /********************/

  return (
    <List.Section title={sectionTitle}>
      {events.map((item, i) => (
        <List.Item
          key={`${i}- ${item.eventId}`}
          title={showFormattedEventTitle(item)}
          icon={{
            tintColor: eventColors[item.color],
            source: Icon.Dot,
          }}
          accessories={[
            {
              text: formatDistance(new Date(item.eventStart), now, {
                addSuffix: true,
              }).replace("about", ""),
            },
            { tag: { value: item.free ? "free" : "busy", color: Color.Blue } },
          ]}
          actions={<MyCalendarEventActionPanel event={item} />}
        />
      ))}
    </List.Section>
  );
};
