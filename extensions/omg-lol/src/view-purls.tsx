import {
  List,
  Icon,
  ActionPanel,
  Action,
  Keyboard,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React, { useState } from "react";

import { GET, DELETE } from "./common/api";
import { PURL, PURLListResponse } from "./common/types";
import { getPrefs } from "./common/prefs";

export default function Command() {
  const [isDeleting, setIsDeleting] = useState(false);

  const { isLoading, data, revalidate } = usePromise(
    async (url: string) => {
      return GET(url) as Promise<PURLListResponse>;
    },
    ["purls"],
  );

  async function deletePURL(title: string): Promise<void> {
    setIsDeleting(true);
    await DELETE(`purl/${title}`);
    await showToast({ title: `Deleted "${title}"` });
    revalidate();
    setIsDeleting(false);
  }

  const prefs = getPrefs();

  function getPURL(purl: PURL) {
    return `https://${prefs.username}.url.lol/${purl.name}`;
  }

  const isShowingEmpty = !isLoading && !isDeleting && data?.purls.length === 0;

  return (
    <List isLoading={isLoading || isDeleting} isShowingDetail={!isShowingEmpty}>
      {isShowingEmpty ? (
        <List.EmptyView icon={Icon.ArrowRightCircle} title="No PURLs!" />
      ) : (
        data?.purls.map((purl) => (
          <List.Item
            key={purl.name}
            title={purl.name}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Name"
                      text={purl.name}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="URL"
                      text={purl.url}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Counter"
                      text={purl.counter?.toString() ?? "0"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Listed"
                      text={purl.listed === 1 ? "yes" : "no"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={getPURL(purl)} />
                <Action.OpenInBrowser url={purl.url} />
                <Action
                  title="Delete"
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deletePURL(purl.name)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
