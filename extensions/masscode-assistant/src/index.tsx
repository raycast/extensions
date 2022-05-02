import { Action, ActionPanel, Icon, List, showToast, Toast, open } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import type { Snippet, State } from "./types";
import SnippetContent from "./components/snippet-content";
import { storeLastUsed, getLastUsedMap, clearUnusedSnippets, orderSnippets } from "./utils/localStorageHelper";

export default function Command() {
  const [state, setState] = useState<State>({ snippets: [], isLoading: true });

  const handleAction = async function (snippet: Snippet) {
    await storeLastUsed(snippet);

    const orderMap = await getLastUsedMap();
    const orderedSnippets = orderSnippets(state.snippets!, orderMap);

    setState((previous) => ({ ...previous, snippets: orderedSnippets }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get<Snippet[]>("http://localhost:3033/snippets/embed-folder");
        const snippets = data.filter((i) => !i.isDeleted);

        const lastUsedMap = await getLastUsedMap();
        await clearUnusedSnippets(snippets, lastUsedMap);
        const orderedSnippets = orderSnippets(snippets, lastUsedMap);

        setState((previous) => ({ ...previous, snippets: orderedSnippets }));
      } catch (err) {
        setState((previous) => ({
          ...previous,
          error: err instanceof Error ? err : new Error("Something went wrong"),
        }));
      }

      setState((previous) => ({ ...previous, isLoading: false }));
    };

    fetchData();
  }, []);

  if (state.error) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "massCode is not running",
      message: "Launch it or download from https://masscode.io",
      primaryAction: {
        title: "Download massCode",
        onAction: (toast) => {
          open("https://masscode.io");
          toast.hide();
        },
      },
    };
    showToast(options);
  }

  return (
    <List
      searchBarPlaceholder="Type to search snippets"
      isLoading={state.isLoading}
      selectedItemId={state.snippets && state.snippets!.length > 0 ? state.snippets[0].id : "0"}
      isShowingDetail
    >
      {state.snippets?.map((i) => {
        return (
          <List.Item
            id={i.id}
            key={i.id}
            title={i.name}
            keywords={[i.content[0].language]}
            subtitle={i.content[0].language}
            icon={Icon.TextDocument}
            detail={<SnippetContent snippet={i} selectedFragment={0} />}
            actions={
              <ActionPanel title="Actions">
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    content={i.content[0].value}
                    onCopy={() => {
                      handleAction(i);
                    }}
                  />
                  <Action.Paste
                    content={i.content[0].value}
                    onPaste={() => {
                      handleAction(i);
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          ></List.Item>
        );
      })}
    </List>
  );
}
