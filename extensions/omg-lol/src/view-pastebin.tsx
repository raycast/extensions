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
import { PasteListResponse } from "./common/types";
import { getPrefs } from "./common/prefs";

export default function Command() {
  const [isDeleting, setIsDeleting] = useState(false);

  const { isLoading, data, revalidate } = usePromise(
    async (url: string) => {
      return GET(url) as Promise<PasteListResponse>;
    },
    ["pastebin"],
  );

  async function deletePaste(title: string): Promise<void> {
    setIsDeleting(true);
    await DELETE(`pastebin/${title}`);
    await showToast({ title: `Deleted "${title}"` });
    revalidate();
    setIsDeleting(false);
  }

  const prefs = getPrefs();
  const isShowingEmpty =
    !isLoading && !isDeleting && data?.pastebin.length === 0;

  return (
    <List isLoading={isLoading || isDeleting} isShowingDetail={!isShowingEmpty}>
      {isShowingEmpty ? (
        <List.EmptyView
          icon={Icon.Clipboard}
          title="No pastes in your pastebin!"
        />
      ) : (
        data?.pastebin.map((paste) => (
          <List.Item
            key={paste.title}
            title={paste.title}
            detail={
              <List.Item.Detail
                markdown={`\`\`\`\n${paste.content}\n\`\`\`\n`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Title"
                      text={paste.title}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="URL"
                      text={`https://${prefs.username}.paste.lol/${paste.title}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Listed"
                      text={paste.listed === 1 ? "yes" : "no"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={paste.content} />
                <Action.CopyToClipboard
                  content={`https://${prefs.username}.paste.lol/${paste.title}`}
                  title={"Copy URL to Clipboard"}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Delete"
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deletePaste(paste.title)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
