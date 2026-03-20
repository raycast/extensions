import { useEffect, useState, type FC } from "react";
import { Event } from "../types/event";
import { EventActions } from "../hooks/useEvent.types";
import { useEventActions } from "../hooks/useEvent";
import { Action, ActionPanel } from "@raycast/api";

export type MyCalendarEventActionPanelProps = { event: Event };

export const MyCalendarEventActionPanel: FC<MyCalendarEventActionPanelProps> = ({ event }) => {
  /********************/
  /*   custom hooks   */
  /********************/

  const { getEventActions } = useEventActions();

  /********************/
  /*     useState     */
  /********************/

  const [eventActions, setEventActions] = useState<EventActions>([]);

  /********************/
  /* useMemo & consts */
  /********************/

  /********************/
  /*    useCallback   */
  /********************/

  const loadEventActions = () => {
    const actions = getEventActions(event);
    setEventActions(actions);
  };

  /********************/
  /*    useEffects    */
  /********************/

  useEffect(() => {
    void loadEventActions();
  }, []);

  /********************/
  /*       JSX        */
  /********************/

  return (
    <ActionPanel>
      {eventActions.map((action) => (
        <Action
          key={action.title}
          title={action.title}
          icon={action.icon}
          onAction={() => {
            action.action();
          }}
        />
      ))}
    </ActionPanel>
  );
};
