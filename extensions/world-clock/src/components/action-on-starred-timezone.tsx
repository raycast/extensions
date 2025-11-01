import { Action, ActionPanel, getPreferenceValues, Icon, LocalStorage } from "@raycast/api";
import { CurrentTime, Timezone } from "../types/types";
import { localStorageKey } from "../utils/costants";
import { ActionToggleDetails } from "./action-toggle-details";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { ActionTimeInfo } from "./action-time-info";
import EditTimeZone from "../edit-time-zone";
import { Preferences } from "../types/preferences";
import { addTimeZones } from "../utils/common-utils";
import { MutatePromise } from "@raycast/utils";

export function ActionOnStarredTimezone(props: {
  index: number;
  currentTime: CurrentTime | undefined;
  starTimezones: Timezone[];
  timezone: Timezone;
  mutate: () => Promise<void>;
  showDetail: boolean;
  showDetailMutate: MutatePromise<boolean | undefined, boolean | undefined> | undefined;
}) {
  const { index, currentTime, starTimezones, timezone, mutate, showDetail, showDetailMutate } = props;
  return (
    <ActionPanel>
      {currentTime && starTimezones[index].timezone === timezone.timezone && (
        <ActionTimeInfo currentTime={currentTime} />
      )}
      <ActionPanel.Section>
        <Action
          icon={Icon.StarDisabled}
          title={"Unstar Timezone"}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={async () => {
            if (starTimezones.some((value) => value.timezone === timezone.timezone)) {
              const _starTimezones = [...starTimezones];
              _starTimezones.splice(index, 1);
              _starTimezones.forEach((value) => {
                value.date_time = "";
                value.unixtime = 0;
              });
              await LocalStorage.setItem(localStorageKey.STAR_TIMEZONE, JSON.stringify(_starTimezones)).then(mutate);
            }
          }}
        />
        <Action.Push
          icon={Icon.Pencil}
          title={"Edit Timezone"}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<EditTimeZone index={index} starTimezones={starTimezones} />}
          onPop={() => mutate()}
        />
        <Action
          icon={Icon.Duplicate}
          title={"Duplicate Timezone"}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={async () => {
            await addTimeZones(starTimezones, starTimezones[index], index);
            await mutate();
          }}
        />
      </ActionPanel.Section>

      {getPreferenceValues<Preferences>().itemLayout === "List" && (
        <ActionToggleDetails showDetail={showDetail} showDetailMutate={showDetailMutate} />
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
              LocalStorage.setItem(localStorageKey.STAR_TIMEZONE, JSON.stringify(_starTimezones)).then(mutate);
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
              LocalStorage.setItem(localStorageKey.STAR_TIMEZONE, JSON.stringify(_starTimezones)).then(mutate);
            }}
          />
        )}
      </ActionPanel.Section>

      <ActionOpenCommandPreferences command={true} extension={true} />
    </ActionPanel>
  );
}
