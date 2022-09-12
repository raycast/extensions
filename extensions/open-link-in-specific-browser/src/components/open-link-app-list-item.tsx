import { ItemInput } from "../utils/input-utils";
import React from "react";
import { List } from "@raycast/api";
import { ActionOnOpenLinkApp } from "./action-on-open-link-app";
import { OpenLinkApplication } from "../types/types";

export function SurfBoardsListItem(props: {
  isCustom: boolean;
  itemInput: ItemInput;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  index: number;
  openLinkApplications: OpenLinkApplication[];
}) {
  const { isCustom, itemInput, setRefresh, index, openLinkApplications } = props;

  const application = openLinkApplications[index];

  return (
    <List.Item
      title={application.name}
      icon={{ fileIcon: application.path }}
      actions={
        <ActionOnOpenLinkApp
          isCustom={isCustom}
          index={index}
          openLinkApplication={application}
          openLinkApplications={openLinkApplications}
          itemInput={itemInput}
          setRefresh={setRefresh}
        />
      }
    />
  );
}
