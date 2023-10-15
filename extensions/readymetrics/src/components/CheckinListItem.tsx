import { Checkin } from "../client/readymetrics";
import { ActionPanel, Detail, List, Action, Image } from "@raycast/api";

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types */

type CheckinListItemProps = {
  checkin: Checkin;
};

export default function CheckinListItem({ checkin }: CheckinListItemProps) {
  const colors: any = {
    blue: "#268afd",
    green: "#3cbe6f",
    orange: "#f6a121",
    red: "#e23d33",
    purple: "#954bf3",
    pink: "#de5bb1",
    grey: "#818181",
    "light-blue": "#40b3d8",
    yellow: "#ebda42",
  };

  return (
    <List.Item
      key={checkin.id}
      title={checkin.checkinEmployeeName}
      icon={{ source: checkin.checkinEmployeePicture, mask: Image.Mask.Circle }}
      subtitle={new Date(checkin.scheduledFor * 1000).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "numeric",
      })}
      accessories={[
        {
          text: checkin.checkinType,
        },
        {
          icon: {
            source: checkin.icon + ".svg",
            tintColor: getColorCodeFromColor(checkin.color),
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={"https://ready.app/employee/checkin/" + checkin.id} />
        </ActionPanel>
      }
    ></List.Item>
  );
  function getColorCodeFromColor(color: any) {
    return colors[color];
  }
}
