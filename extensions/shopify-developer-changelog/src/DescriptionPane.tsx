import { Detail } from "@raycast/api";
import React from "react";
import { DescriptionPaneActions } from "./Actions";
import { htmlToMarkdown } from "./helpers/htmlToMarkdown";

export function DescriptionPane(props: { item: any }) {
  const updateAsMarkdown = htmlToMarkdown(props.item.content, props.item.title);
  return (
    <Detail
      markdown={updateAsMarkdown}
      navigationTitle={props.item.title}
      actions={<DescriptionPaneActions item={props.item} />}
    />
  );
}
