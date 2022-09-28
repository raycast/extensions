import { ItemInput } from "../utils/input-utils";
import React from "react";
import { Grid } from "@raycast/api";
import { ActionOnOpenLinkApp } from "./action-on-open-link-app";
import { OpenLinkApplication } from "../types/types";

export function OpenLinkAppGridItem(props: {
  isCustom: boolean;
  itemInput: ItemInput;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  index: number;
  openLinkApplications: OpenLinkApplication[];
}) {
  const { isCustom, itemInput, setRefresh, index, openLinkApplications } = props;

  const application = openLinkApplications[index];

  return (
    <Grid.Item
      title={application.name}
      content={{ fileIcon: application.path }}
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
