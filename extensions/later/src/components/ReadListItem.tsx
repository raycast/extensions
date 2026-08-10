import React from "react";
import { ListItem } from "../types/common";
import { Icon, List } from "@raycast/api";
import ItemActions from "./ItemActions";

const ReadListItem: React.FC<ListItem> = (props) => {
  const addTime = new Date(props.add_time);

  return (
    <List.Item
      icon={props.read ? Icon.Checkmark : Icon.Circle}
      key={props.url}
      title={props.title}
      subtitle={props.domain}
      accessories={[{ date: addTime, icon: Icon.Clock, tooltip: addTime.toLocaleString() }]}
      actions={<ItemActions {...props} />}
    />
  );
};

export default ReadListItem;
