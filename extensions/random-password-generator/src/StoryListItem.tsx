import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Actions } from "./Action";
import { Details } from "./Details";
import { PasswordDetails, StoryListItemProps } from "./interface";
import { getPasswordDetails } from "./passwordDetails";
import { getIcon } from "./util";

export function StoryListItem(item: StoryListItemProps) {
  const [details, setDetails] = useState<PasswordDetails>();

  useEffect(() => {
    const details = getPasswordDetails(item.password);
    setDetails(details);
  }, [item.password]);

  const itemProps = item.showingDetails
    ? {
        detail: <Details data={details} />,
      }
    : {
        accessoryTitle: details?.crackTime ? `guessed in ${details.crackTime}` : "",
        subtitle: details?.warning ?? "",
      };

  return (
    <List.Item
      icon={getIcon(details?.score)}
      title={item.password}
      actions={<Actions password={item.password} setShowingDetails={item.setShowingDetails} />}
      {...itemProps}
    />
  );
}
