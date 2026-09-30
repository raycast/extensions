import { RSSItem } from "../util/rss";
import { Action } from "@raycast/api";
import { Fragment } from "react";

const LinkActions = ({ item }: { item: RSSItem }) => {
  if (!item.link) {
    return null;
  }
  return (
    <Fragment>
      <Action.OpenInBrowser title="Open in Browser" url={item.link!} />
      <Action.CopyToClipboard title="Copy Link to Clipboard" content={item.link!} />
    </Fragment>
  );
};

export default LinkActions;
