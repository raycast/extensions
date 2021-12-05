import {
  ActionPanel,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  Icon,
  Color
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";

import { preferences } from "../../helpers/preferences";
import { SearchState, Dashboard } from "./interface";

interface State {
  items?: any[];
  error?: Error;
}

export function Dashboard() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchStories() {
      try {
        const feed = { items: ["jqnwd"] }
        setState({
          items:
            [
              {
                "id": 1,
                "name": "John"
              },
              {
                "id": 2,
                "name": "Doe"
              }
            ]
        });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchStories();
  }, []);

  console.log(state.items) // Prints stories

  return (
    <List isLoading={!state.items && !state.error} >
      <List.Section title="Items">
        {state.items?.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <OpenInBrowserAction
                    title="Open PR in Browser"
                    url={`https://bitbucket.org`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Items">
        {state.items?.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
          // actions={
          //   <ActionPanel>
          //     <ActionPanel.Section>
          //       <OpenInBrowserAction
          //         title="Open PR in Browser"
          //         url={`https://bitbucket.org/${pr.repo.fullName}/pull-requests/${pr.id}`}
          //       />
          //     </ActionPanel.Section>
          //   </ActionPanel>
          // }
          />
        ))}
      </List.Section>
    </List>
  )
}
