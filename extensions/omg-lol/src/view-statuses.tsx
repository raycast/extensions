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
import { StatusListResponse } from "./common/types";
import { getPrefs } from "./common/prefs";

const prefs = getPrefs();

function getStatusUrl(id: string) {
  return `https://${prefs.username}.status.lol/${id}`;
}

export default function Command() {
  const [isDeleting, setIsDeleting] = useState(false);

  const { isLoading, data, revalidate } = usePromise(
    async (url: string) => {
      return GET(url) as Promise<StatusListResponse>;
    },
    ["statuses"],
  );

  async function deleteStatus(id: string): Promise<void> {
    setIsDeleting(true);
    await DELETE(`statuses/${id}`);
    await showToast({ title: "Deleted status" });
    revalidate();
    setIsDeleting(false);
  }

  const isShowingEmpty =
    !isLoading && !isDeleting && data?.statuses.length === 0;

  return (
    <List isLoading={isLoading || isDeleting}>
      {isShowingEmpty ? (
        <List.EmptyView icon={Icon.ArrowRightCircle} title="No statuses!" />
      ) : (
        data?.statuses.map((status) => (
          <List.Item
            key={status.id}
            title={`${status.emoji} ${status.content}`}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={`${status.emoji} ${status.content}`}
                />
                <Action.OpenInBrowser url={getStatusUrl(status.id)} />
                <Action
                  title="Delete"
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteStatus(status.id)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
