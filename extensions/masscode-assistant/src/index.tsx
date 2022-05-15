import { Action, ActionPanel, Icon, List } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import type { Snippet, State } from "./types";
import SnippetContent from "./components/snippet-content";
import { massCodeInstallationCheck } from "./components/checkInstall";

export default function Command() {
  const [state, setState] = useState<State>({ snippets: [], isLoading: true });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get<Snippet[]>("http://localhost:3033/snippets/embed-folder");

        const snippets = data.filter((i) => !i.isDeleted);

        setState((previous) => ({ ...previous, snippets }));
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
    massCodeInstallationCheck();
  }

  return (
    <List searchBarPlaceholder="Type to search snippets" isLoading={state.isLoading} isShowingDetail>
      {state.snippets?.map((i) => {
        return (
          <List.Item
            key={i.id}
            title={i.name}
            keywords={[i.content[0].language]}
            subtitle={i.content[0].language}
            icon={Icon.Document}
            detail={<SnippetContent snippet={i} selectedFragment={0} />}
            actions={
              <ActionPanel title="Actions">
                <ActionPanel.Section>
                  <Action.CopyToClipboard content={i.content[0].value} />
                  <Action.Paste content={i.content[0].value} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          ></List.Item>
        );
      })}
    </List>
  );
}
