import { Action, ActionPanel, List, useNavigation, Icon } from "@raycast/api";
import { memo } from "react";
import { HueGenerateRecord } from "../types";
import { updateHueGenerateRecord } from "../utils";
import HueDetail from "./hue-detail";

interface HueRecordListItemProps {
  record: HueGenerateRecord;
  setHueRecords: React.Dispatch<React.SetStateAction<HueGenerateRecord[]>>;
  hueRecords: HueGenerateRecord[];
}

const HueRecordListItem = memo(function HueRecordListItem({
  record,
  setHueRecords,
  hueRecords,
}: HueRecordListItemProps) {
  const { push } = useNavigation();
  return (
    <List.Item
      key={record.hue.name + record.createAt}
      title={record.hue.name}
      icon={{ source: "extension-icon.png" }}
      accessories={[
        {
          tooltip: record.star ? "Starred" : "",
          icon: {
            source: record.star ? Icon.Star : "",
          },
        },
        {
          tooltip: record.hue.colors[0],
          icon: {
            source: `https://hue-palette.zeabur.app/hue-color-image/${record.hue.tailwind_colors["50"].replace("#", "")}`,
          },
        },
        {
          tooltip: record.hue.colors[3],
          icon: {
            source: `https://hue-palette.zeabur.app/hue-color-image/${record.hue.tailwind_colors["300"].replace("#", "")}`,
          },
        },
        {
          tooltip: record.hue.colors[5],
          icon: {
            source: `https://hue-palette.zeabur.app/hue-color-image/${record.hue.tailwind_colors["500"].replace("#", "")}`,
          },
        },
        {
          tooltip: record.hue.colors[7],
          icon: {
            source: `https://hue-palette.zeabur.app/hue-color-image/${record.hue.tailwind_colors["700"].replace("#", "")}`,
          },
        },
        {
          tooltip: record.hue.colors[9],
          icon: {
            source: `https://hue-palette.zeabur.app/hue-color-image/${record.hue.tailwind_colors["900"].replace("#", "")}`,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Show Hue Details"
            icon={Icon.List}
            onAction={() => {
              push(
                <HueDetail
                  isLoading={false}
                  isGenerator={true}
                  name={record.hue.name}
                  tailwind_colors_name={record.hue.tailwind_colors_name}
                  tailwind_colors={record.hue.tailwind_colors}
                />,
              );
            }}
          />
          <Action
            title={record.star ? "Unstar Hue" : "Star Hue"}
            icon={record.star ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={async () => {
              setHueRecords(() => {
                const updatedRecords = hueRecords.map((hueRecord) =>
                  hueRecord.hue.name === record.hue.name &&
                  hueRecord.createAt === record.createAt
                    ? { ...hueRecord, star: !hueRecord.star }
                    : hueRecord,
                );
                updateHueGenerateRecord(updatedRecords);
                return updatedRecords;
              });
            }}
          />
          <Action
            title={"Remove Record"}
            icon={Icon.Trash}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              setHueRecords(() => {
                const updatedRecords = hueRecords.filter(
                  (hueRecord) =>
                    hueRecord.hue.name !== record.hue.name ||
                    hueRecord.createAt !== record.createAt,
                );
                updateHueGenerateRecord(updatedRecords);
                return updatedRecords;
              });
            }}
          />
          <Action.OpenInBrowser
            title="Open Hue in Browser"
            url={`https://www.hue-palette.com/hue/${record.hue.name}/${record.hue.tailwind_colors["50"].replaceAll("#", "")}-${record.hue.tailwind_colors["900"].replaceAll("#", "")}`}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            icon={Icon.AppWindow}
          />
        </ActionPanel>
      }
    />
  );
});

export default HueRecordListItem;
