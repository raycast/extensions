import { useEffect, useState } from "react";
import { List, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import got from "got";

import Preferences from "./interfaces/preference";
import Site from "./interfaces/site";
import State from "./interfaces/state";

const Command = () => {
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
                <Action.OpenInBrowser
                  url={`https://app.usefathom.com/#/?filters=%5B%5D&range=last_7_days&site=${site.id}`}
                  title={`Open ${site.name} Dashboard`}
                />
              </ActionPanel.Section>
              <Action.SubmitForm title="Delete Site" onSubmit={handleDelete} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default Command;
