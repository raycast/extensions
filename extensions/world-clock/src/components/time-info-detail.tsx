import { environment, List } from "@raycast/api";
import { CurrentTime, Timezone } from "../types/types";
import { buildDayAndNightIcon, formatMenubarDate, isEmpty } from "../utils/common-utils";
import fileUrl from "file-url";
import { showClock } from "../types/preferences";

export function TimeInfoDetail(props: { currentTime: CurrentTime; detailLoading: boolean; timezone?: Timezone }) {
  const { timezone, detailLoading, currentTime } = props;
  return (
    <List.Item.Detail
      isLoading={detailLoading}
      markdown={
        !detailLoading && showClock
          ? `<img src="${fileUrl(
              `${environment.assetsPath}/${
                environment.appearance === "light" ? "clock-icons" : "clock-icons@dark"
              }/${new Date(currentTime.dateTime).getHours()}.svg`,
            )}" alt="${currentTime.timeZone}" height="180" />`
          : undefined
      }
      metadata={
        currentTime.dateTime &&
        !detailLoading && (
          <List.Item.Detail.Metadata>
            {!isEmpty(timezone?.memo) && (
              <>
                <List.Item.Detail.Metadata.Label title="Memo" icon={timezone?.memoIcon} text={timezone?.memo} />
                <List.Item.Detail.Metadata.Separator />
              </>
            )}
            <List.Item.Detail.Metadata.Label
              title="Timezone"
              icon={{
                source: {
                  light: buildDayAndNightIcon(currentTime.dateTime, true),
                  dark: buildDayAndNightIcon(currentTime.dateTime, false),
                },
              }}
              text={currentTime.timeZone}
            />
            <List.Item.Detail.Metadata.Label
              title="Date Time"
              text={formatMenubarDate(new Date(currentTime.dateTime))}
            />
          </List.Item.Detail.Metadata>
        )
      }
    />
  );
}
