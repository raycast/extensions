import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { JenkinsAPI, Jenkins, Job, hasSubJobs } from "./lib/api";

interface SearchState {
  results: Job[];
  isLoading: boolean;
}

export function SearchJob(props: { jenkins: Jenkins; jobs?: string[] }) {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });

  const search = useCallback(
    async function search(searchText: string) {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const jenkinsAPI = new JenkinsAPI(props.jenkins);
        const resp = await jenkinsAPI.inspect(props.jobs);
        const jobs = resp.jobs?.filter((job) => job.name.toLowerCase().includes(searchText.toLowerCase()));
        setState((oldState) => ({
          ...oldState,
          results: jobs ?? [],
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

  const onChange = (value: string) => {
    console.log("onChange", value);
  };

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search jobs..."
      throttle
      searchBarAccessory={<SearchModeDropdown value="normal" onChange={onChange} />}
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((job) => (
          <List.Item
            key={job.url}
            title={job.name}
            subtitle={job._class}
            actions={
              <ActionPanel>
                {hasSubJobs(job) ? (
                  <ActionPanel.Section title="Job">
                    <Action.OpenInBrowser title="Open in Browser" url={job.url} />
                    <Action.Push
                      icon={Icon.Folder}
                      title="Sub jobs"
                      target={<SearchJob jenkins={props.jenkins} jobs={[...(props.jobs ?? []), job.path]} />}
                    />
                    <Action.CopyToClipboard icon={Icon.CopyClipboard} title="Copy job url" content={job.url} />
                  </ActionPanel.Section>
                ) : (
                  <ActionPanel.Section title="Job">
                    <Action.OpenInBrowser title="Open in Browser" url={job.url} />
                    <Action.CopyToClipboard icon={Icon.CopyClipboard} title="Copy job url" content={job.url} />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchModeDropdown(props: { value?: string; onChange: (value: string) => void }) {
  const { value, onChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Search Mode"
      value={value}
      onChange={(value) => {
        onChange(value);
      }}
    >
      <List.Dropdown.Section title="Search Mode">
        <List.Dropdown.Item title="Normal" value="normal" />
        <List.Dropdown.Item title="Global" value="global" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
