import { List } from "@raycast/api";
import { ReactElement } from "react";
import { faviconUrl } from "../utils/urlUtils";
import { UrlActions } from "./UrlAction";

export interface UrlResourceEntry {
  url: string;
  title: string;
  id: number | string;
}

export interface UrlListItemProps {
  entry: UrlResourceEntry;
}

export const UrlListItem = ({ entry: { url, title, id } }: UrlListItemProps): ReactElement => {
  const favicon = faviconUrl(64, url);

  return (
    <List.Item
      id={id.toString()}
      title={title}
      subtitle={url}
      icon={favicon}
      actions={<UrlActions title={title} url={url} />}
    />
  );
};
