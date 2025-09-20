import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import axios, { AxiosError } from "axios";

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
          <Action.CopyToClipboard title="Copy Paste URL" content={`https://pastefy.app/${paste.id}`} />
          <Action.OpenInBrowser url={`https://pastefy.app/${paste.id}`} />
          <Action.CreateSnippet
            title="Create Snippet from Paste"
            snippet={{
              name: paste.title,
              text: paste.content,
            }}
          />
          <Action icon={Icon.Trash} title="Delete" onAction={onDelete} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [loginError, setLoginError] = useState(false);

  const { isLoading, data, pagination, revalidate } = usePromise(
    (searchText: string) => async (options: { page: number }) => {
      try {
        const res = await axios.get(
          `https://pastefy.app/api/v2/user/pastes?page=${options.page + 1}&search=${searchText}`,
          {
            headers: {
              Authorization: `Bearer ${getPreferenceValues().apiKey}`,
            },
          },
        );

        return { data: res.data, hasMore: res.data?.length > 0 };
      } catch (e) {
        if (e instanceof AxiosError && e?.response?.status === 401) {
          setLoginError(true);
          throw new Error("Authentication failed");
        }
        throw new Error("Error while fetching pastes");
      }
    },
    [searchText],
  );

  const deletePaste = async (paste: Paste) => {
    await axios.delete(`https://pastefy.app/api/v2/paste/${paste.id}`, {
      headers: {
        Authorization: `Bearer ${getPreferenceValues().apiKey}`,
      },
    });
    revalidate();
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
      {data?.map((paste: Paste) => <PastePreview key={paste.id} paste={paste} onDelete={() => deletePaste(paste)} />)}
    </List>
  );
}
