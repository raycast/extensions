import { List } from "@raycast/api";
import { ZxcvbnResult } from "@zxcvbn-ts/core";
import { useEffect, useState } from "react";
import { Actions } from "./Action";
import { Details } from "./Details";
import { StoryListItemProps } from "./interface";
import { getPasswordDetails } from "./passwordDetails";
import { getIcon } from "./util";

export function StoryListItem(item: StoryListItemProps) {
  const [details, setDetails] = useState<ZxcvbnResult>();

  useEffect(() => {
    if (details) return;
    if (item.autoCalculateDetails || item.isFocused) {
      setDetails(getPasswordDetails(item.password));
    }
  }, [item.password, item.autoCalculateDetails, item.isFocused]);

  const crackTime = details?.crackTimesDisplay.offlineFastHashing1e10PerSecond;
  const subtitle = details?.feedback.warning ?? "";

  const itemProps = item.showingDetails
    ? {
        detail: <Details data={details} />,
      }
    : {
        accessoryTitle: crackTime ? `guessed in ${crackTime}` : "",
        subtitle,
      };

  return (
    <List.Item
      id={item.password}
      icon={getIcon(details?.score)}
      title={item.password}
      actions={<Actions password={item.password} setShowingDetails={item.setShowingDetails} />}
      {...itemProps}
    />
  );
}
