import type { FC } from "react";
import { useEventActions } from "../hooks/useEvent";
import { Event } from "../types/event";
import { MenuBarExtra, Icon } from "@raycast/api";
import { eventColors } from "../utils/events";
import { MenuBarEventActionItems } from "./MenuBarEventActionItems";

export type MenuBarEventSectionProps = { events: Event[]; sectionTitle: string };

export const MenuBarEventSection: FC<MenuBarEventSectionProps> = ({ events, sectionTitle }) => {
  /********************/
  /*   custom hooks   */
  /********************/

  const { showFormattedEventTitle } = useEventActions();

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
    <>
      {/* wrapping Submenu in Section as children seemed to cause UI glitch */}
      <MenuBarExtra.Section title={sectionTitle} />
      {events.map((event) => (
        <MenuBarExtra.Submenu
          key={event.eventId}
          icon={{
            source: Icon.Dot,
            tintColor: eventColors[event.color],
          }}
          title={showFormattedEventTitle(event, true)}
        >
          <MenuBarEventActionItems event={event} />
        </MenuBarExtra.Submenu>
      ))}
    </>
  );
};
