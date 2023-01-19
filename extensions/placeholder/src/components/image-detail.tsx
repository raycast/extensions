import { ActionPanel, Detail } from "@raycast/api";
import { PicsumImageAction } from "./picsum-image-action";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";

export function ImageDetail(props: {
  imageURL: string;
  size: string;
  primaryAction: string;
  autoRefresh: boolean;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { imageURL, size, primaryAction, autoRefresh, setRefresh } = props;
  return (
    <Detail
      navigationTitle={"Image Preview " + size}
      markdown={`<img src="${imageURL}" alt="" height="400" />`}
      actions={
        <ActionPanel>
          <PicsumImageAction
            imageURL={imageURL}
            size={size}
            primaryAction={primaryAction}
            autoRefresh={autoRefresh}
            setRefresh={setRefresh}
          />

          <ActionOpenPreferences />
        </ActionPanel>
      }
    ></Detail>
  );
}
