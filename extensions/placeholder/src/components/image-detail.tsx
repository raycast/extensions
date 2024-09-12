import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { PicsumImageAction } from "./picsum-image-action";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";

export function ImageDetail(props: {
  imageURL: string;
  size: string;
  autoRefresh: boolean;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { imageURL, size, autoRefresh, setRefresh } = props;
  return (
    <Detail
      navigationTitle={"Image Preview " + size}
      markdown={`<img src="${imageURL}" alt="" height="400" />`}
      actions={
        <ActionPanel>
          <PicsumImageAction imageURL={imageURL} size={size} autoRefresh={autoRefresh} setRefresh={setRefresh} />
          <ActionPanel.Section>
            <Action
              icon={Icon.Minimize}
              title={"Quit Preview"}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
              onAction={useNavigation().pop}
            />
          </ActionPanel.Section>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    ></Detail>
  );
}
