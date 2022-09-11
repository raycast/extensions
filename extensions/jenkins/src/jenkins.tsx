import {
    ActionPanel,
    Action,
    showToast,
    Toast,
    List,
    Alert,
    confirmAlert,
    Icon
} from "@raycast/api";
import { SearchJob } from "./search-job";
import { Jenkins } from "./lib/api";
import { AddJenkins } from "./add-jenkins";
import { deleteJenkins, listJenkins } from "./lib/storage";
import { useState, useCallback, useEffect } from 'react';

interface SearchState {
  results: Jenkins[];
  isLoading: boolean;
}

export default function Command() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });

  const search = useCallback(
    async function search(searchText: string) {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const jenkinsList = await listJenkins();
        const results = jenkinsList.filter(j => j.name.toLowerCase().includes(searchText.toLowerCase()))
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [setState]
  );

  useEffect(() => {
    search("");
  }, []);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search jenkins..."
      throttle
      actions={
        <ActionPanel>
          <Action.Push title="Add jenkins" target={<AddJenkins />} />
        </ActionPanel>
      }
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <JenkinsItem key={searchResult.name} jenkins={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function JenkinsItem({ jenkins }: { jenkins: Jenkins }) {
  return (
    <List.Item
      title={jenkins.name}
      subtitle={jenkins.version}
      accessories={[{ text: jenkins.url }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={jenkins.url} />
            <Action.Push icon={Icon.Filter} title="Search jobs" target={<SearchJob jenkins={jenkins} />} />
            <Action.Push icon={Icon.NewDocument} title="Add jenkins" target={<AddJenkins />} shortcut={{ modifiers: ["cmd"], key: "n" }} />
            <Action.Push icon={Icon.Patch} title="Update jenkins" target={<AddJenkins jenkins={jenkins} />} shortcut={{ modifiers: ["cmd"], key: "." }} />
            <Action.SubmitForm icon={Icon.Warning} title="Delete jenkins" onSubmit={async () => {
              const options: Alert.Options = {
                title: "Delete jenkins?",
                primaryAction: {
                  title: "Delete jenkins",
                  onAction: async () => {
                    await deleteJenkins(jenkins.id);
                  },
                },
              };
              if (await confirmAlert(options)) {
                await showToast(Toast.Style.Success, "Delete jenkins successfully");
              }
            }} shortcut={{ modifiers: ["cmd"], key: "delete" }} />
            <Action.CopyToClipboard title="Copy jenkins url" content={jenkins.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
