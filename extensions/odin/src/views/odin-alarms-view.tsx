import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import OdinHelper from "../helpers/OdinHelper";
import { OdinAlarm } from "../models/OdinAlarm";
import { OdinAlarmListItem } from "./odin-alarm-list-item";
import {
  ODIN_SOURCE_INDICATION,
  ODIN_STRINGS_NO_ALARMS_FOUND,
  ODIN_STRINGS_SEARCH_PLACEHOLDER,
} from "../constants/OdinConstants";

export default function OdinAlarmsView() {
  const odinHelper = new OdinHelper();

  const [state, setState] = useState<{
    odinAlarmsModel: null | [OdinAlarm];
    lastUpdated: null | string;
    isLoading: boolean;
  }>({
    odinAlarmsModel: null,
    lastUpdated: null,
    isLoading: true,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const retrievedResult = await odinHelper.retrieveAlarmsFromOdinPuls();

        setState((prevState) => {
          return {
            ...prevState,
            odinAlarmsModel: retrievedResult?.[0] as [OdinAlarm],
            lastUpdated: retrievedResult?.[1] as string,
            isLoading: false,
          };
        });
      } catch (error: unknown) {
        console.log(error);
      }
    }

    fetchData();
  }, []);

  return (
    <>
      <List isLoading={state.isLoading} searchBarPlaceholder={ODIN_STRINGS_SEARCH_PLACEHOLDER}>
        {!odinHelper.didFindAlarms(state.odinAlarmsModel) ? (
          <List.EmptyView title={ODIN_STRINGS_NO_ALARMS_FOUND} />
        ) : (
          <List.Section title={ODIN_SOURCE_INDICATION}>
            {state.odinAlarmsModel?.map((odinAlarm) => (
              <OdinAlarmListItem key={odinHelper.generateRandomUUID()} odinAlarmModel={odinAlarm} />
            ))}
          </List.Section>
        )}
      </List>
    </>
  );
}
