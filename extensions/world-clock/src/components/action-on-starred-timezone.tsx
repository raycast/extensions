import { Action, ActionPanel, getPreferenceValues, Icon, LocalStorage } from "@raycast/api";
import { TimeInfo, Timezone } from "../types/types";
import { Dispatch, SetStateAction } from "react";
import { localStorageKey } from "../utils/costants";
import { ActionToggleDetails } from "./action-toggle-details";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { ActionTimeInfo } from "./action-time-info";
import EditTimeZone from "../edit-time-zone";
import { Preferences } from "../types/preferences";

export function ActionOnStarredTimezone(props: {
  timeInfo: TimeInfo;
  index: number;
  starTimezones: Timezone[];
  timezone: string;
  setRefresh: Dispatch<SetStateAction<number>>;
  showDetail: boolean;
  setRefreshDetail: Dispatch<SetStateAction<number>>;
}) {
  const { timeInfo, index, starTimezones, timezone, setRefresh, showDetail, setRefreshDetail } = props;
  return (
    <ActionPanel>
      <ActionTimeInfo timeInfo={timeInfo} />
      <Action
        icon={Icon.StarDisabled}
        title={"Unstar Timezone"}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={async () => {
          if (starTimezones.some((value) => value.timezone === timezone)) {
            const _starTimezones = [...starTimezones];
            _starTimezones.splice(index, 1);
            _starTimezones.forEach((value) => {
              value.date_time = "";
              value.unixtime = 0;
            });
            await LocalStorage.setItem(localStorageKey.STAR_TIMEZONE, JSON.stringify(_starTimezones)).then(() => {
              setRefresh(Date.now());
            });
          }
        }}
      />
      <Action.Push
        icon={Icon.Pencil}
        title={"Edit Timezone"}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        target={<EditTimeZone index={index} starTimezones={starTimezones} setRefresh={setRefresh} />}
      />
      {getPreferenceValues<Preferences>().itemLayout === "List" && (
        <ActionToggleDetails showDetail={showDetail} setRefresh={setRefreshDetail} />
      )}

      <ActionPanel.Section>
        {index != 0 && (
          <Action
            icon={Icon.ArrowUpCircle}
            title={"Move Up"}
            shortcut={{ modifiers: ["shift", "cmd"], key: "arrowUp" }}
            onAction={() => {
              const _starTimezones = [...starTimezones];
              const [removed] = _starTimezones.splice(index, 1);
              _starTimezones.splice(index - 1, 0, removed);
              LocalStorage.setItem(localStorageKey.STAR_TIMEZONE, JSON.stringify(_starTimezones)).then(() => {
                setRefresh(Date.now());
              });
            }}
          />
        )}
        {index != starTimezones.length - 1 && (
          <Action
            icon={Icon.ArrowDownCircle}
            title={"Move Down"}
            shortcut={{ modifiers: ["shift", "cmd"], key: "arrowDown" }}
            onAction={() => {
              const _starTimezones = [...starTimezones];
              const [removed] = _starTimezones.splice(index, 1);
              _starTimezones.splice(index + 1, 0, removed);
              LocalStorage.setItem(localStorageKey.STAR_TIMEZONE, JSON.stringify(_starTimezones)).then(() => {
                setRefresh(Date.now());
              });
            }}
          />
        )}
      </ActionPanel.Section>

      <ActionOpenCommandPreferences command={true} extension={true} />
    </ActionPanel>
  );
}
