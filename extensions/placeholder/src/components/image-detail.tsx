import { ActionPanel, Detail } from "@raycast/api";
import { ImageAction } from "./image-action";
import React from "react";

export function ImageDetail(props: {
  imageURL: string;
  primaryAction: string;
  autoRefresh: boolean;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { imageURL, primaryAction, autoRefresh, setRefresh } = props;
  return (
    <Detail
      markdown={`<img src="${imageURL}" alt="" height="400" />`}
      actions={
        <ActionPanel>
          <ImageAction
            imageURL={imageURL}
            primaryAction={primaryAction}
            autoRefresh={autoRefresh}
            setRefresh={setRefresh}
          />
        </ActionPanel>
      }
    ></Detail>
  );
}
