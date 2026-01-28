import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { API_HEADERS, API_URL, PASTEFY_URL } from "./api";

type Paste = {
  id: string;
  title: string;
  content: string;
  type: string;
  expire_at?: string;
  encrypted?: boolean;
  created_at: string;
};

function PastePreview({ paste, onDelete = () => {} }: { paste: Paste; onDelete: () => void }) {
  let markdown = `## ${paste.title} ${paste.type === "MULTI_PASTE" ? "`Multi-Paste`" : ""}\n`;

  const createContentBlock = (title: string, content: string) => {
    if (paste.title?.endsWith(".md")) {
      return `---
${content}
---`;
    } else {
      return `\`\`\`${title?.split(".")?.at(-1) || "js"}
${content}
\`\`\``;
    }
  };

  if (paste.type === "MULTI_PASTE") {
    const parts = JSON.parse(paste.content);
    for (const { name, contents } of parts) {
      markdown += `---
            

### ${name}
${createContentBlock(name, contents)}
`;
    }
  } else {
    markdown += createContentBlock(paste.title, paste.content);
  }

  return (
    <List.Item
      icon={Icon.Code}
      title={paste.title || "untitled"}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel title="Paste Options">
          <Action.CopyToClipboard title="Copy Paste Content" content={paste.content} />
          <Action.Paste title="Paste Content" content={paste.content} />
          <Action.CopyToClipboard title="Copy Paste URL" content={`${PASTEFY_URL}/${paste.id}`} />
          <Action.OpenInBrowser url={`${PASTEFY_URL}/${paste.id}`} />
          <Action.CreateSnippet
            title="Create Snippet from Paste"
            snippet={{
              name: paste.title,
              text: paste.content,
            }}
          />
          <Action
            icon={Icon.Trash}
            title="Delete"
            onAction={onDelete}
            shortcut={Keyboard.Shortcut.Common.Remove}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [loginError, setLoginError] = useState(false);

  const { isLoading, data, pagination, mutate } = useFetch(
    (options: { page: number }) => `${API_URL}/user/pastes?page=${options.page + 1}&search=${searchText}`,
    {
      headers: API_HEADERS,
      async parseResponse(response) {
        if (response.status === 401) {
          setLoginError(true);
          throw new Error("Authentication failed");
        }
        if (!response.ok) throw new Error("Error while fetching pastes");
        const result = (await response.json()) as Paste[];
        return result;
      },
      mapResult(result) {
        return {
          data: result,
          hasMore: !!result.length,
        };
      },
    },
  );

  const deletePaste = async (paste: Paste) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting",
      message: paste.id,
    });
    try {
      await mutate(
        fetch(`${API_URL}/paste/${paste.id}`, {
          method: "DELETE",
          headers: API_HEADERS,
        }),
        {
          optimisticUpdate(data) {
            return data?.filter((p) => p.id !== paste.id);
          },
          shouldRevalidateAfter: false,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = `${error}`;
    }
  };

  return loginError ? (
    <Detail
      actions={
        <ActionPanel title="Pastefy Authentication">
          <Action title="Add Key" icon={Icon.AddPerson} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
      markdown={`# Authentication failed
You need to set a valid API-Key in the extensions preferences`}
    />
  ) : (
    <List isShowingDetail isLoading={isLoading} onSearchTextChange={setSearchText} pagination={pagination}>
      {data?.map((paste: Paste) => (
        <PastePreview key={paste.id} paste={paste} onDelete={() => deletePaste(paste)} />
      ))}
    </List>
  );
}
