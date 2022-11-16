import { List, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import got from "got";

import Preferences from "./interfaces/preference";
import State from "./interfaces/state";
import Site from "./interfaces/site";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<State>({});

  async function handleDelete(site: Site) {
    const toast: Toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting site...",
    });

    try {
      await got
        .delete(`https://api.usefathom.com/v1/sites/${site.id}`, {
          headers: {
            Authorization: `Bearer ${preferences.apiToken}`,
          },
        })
        .json();

      toast.style = Toast.Style.Success;
      toast.title = "Deleted site.";
      toast.message = "Your site has been successfully deleted.";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Whoops!";
      toast.message = "Something has gone wrong.";
    }
  }

  useEffect(() => {
    async function fetchSites() {
      try {
        const { data } = await got
          .get("https://api.usefathom.com/v1/sites?limit=100", {
            headers: {
              Authorization: `Bearer ${preferences.apiToken}`,
            },
          })
          .json();

        setState({ sites: data });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchSites();
  }, []);

  return (
    <List isLoading={!state.sites && !state.error}>
      {state.sites?.map((site) => (
        <List.Item
          key={site.id}
          title={site.name}
          subtitle={site.id}
          actions={
            <ActionPanel title={site.name}>
              <ActionPanel.Section>
                <Action.SubmitForm onSubmit={() => handleDelete(site)} title={`Delete ${site.name}`} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
