import { ActionPanel, Action, List, showToast, Toast, Icon, Alert, confirmAlert } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { JenkinsAPI, Jenkins, Job, hasSubJobs, Suggestion, View, Build } from "./lib/api";

interface SearchProps {
  jenkins: Jenkins;
  jobs?: string[];
  mode: string;
  navigationTitle: string;
  suggestions?: string[];
}

export function Search(props: SearchProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");

  const search = useCallback(
    async function search(text: string) {
      if (searchText !== text) {
        setSearchText(text);
      }
      setIsLoading(true);
      try {
        const jenkinsAPI = new JenkinsAPI(props.jenkins);
        if (props.mode === "normal") {
          const resp = await jenkinsAPI.inspect(props.jobs);
          setJobs(resp.jobs?.filter((job) => job.name.toLowerCase().includes(text.toLowerCase())) ?? []);
        } else {
          if (text !== "") {
            setSuggestions(await jenkinsAPI.search(text));
          }
        }
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Search failed", message: String(error) });
      } finally {
        setIsLoading(false);
      }
    },
    [setJobs, setSuggestions]
  );

  useEffect(() => {
    search("");
  }, []);

  if (props.mode === "normal") {
    return (
      <List
        navigationTitle={props.navigationTitle}
        isLoading={isLoading}
        onSearchTextChange={search}
        searchBarPlaceholder={props.mode === "normal" ? "Search jobs..." : "Search..."}
        throttle
      >
        <List.Section title="Results" subtitle={jobs.length + ""}>
          {jobs.map((job) => (
            <List.Item
              key={job.url}
              title={job.name}
              subtitle={job.short_class}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser title="Open in Browser" url={job.url} />
                    {!hasSubJobs(job) ? (
                      <Action.Push
                        icon={Icon.Box}
                        title="Builds"
                        target={
                          <Build
                            jenkins={props.jenkins}
                            jobs={props.jobs ? [...props.jobs, job.path ?? ""] : [job.path ?? ""]}
                          />
                        }
                      />
                    ) : (
                      <></>
                    )}
                    {hasSubJobs(job) ? (
                      <Action.Push
                        icon={Icon.Folder}
                        title="Sub Jobs"
                        target={
                          <Search
                            jenkins={props.jenkins}
                            jobs={[...(props.jobs ?? []), job.path ?? ""]}
                            mode={props.mode}
                            navigationTitle={`${props.navigationTitle} - ${job.name}`}
                          />
                        }
                      />
                    ) : (
                      <Action.SubmitForm
                        icon={Icon.Forward}
                        title="Build Job"
                        shortcut={{ modifiers: ["cmd"], key: "b" }}
                        onSubmit={async () => {
                          const options: Alert.Options = {
                            title: "Build the Job",
                            message: "Try to build job without parameters",
                            primaryAction: {
                              title: "Build Job",
                              onAction: async () => {
                                try {
                                  const jenkinsAPI = new JenkinsAPI(props.jenkins);
                                  await jenkinsAPI.build(job);
                                  showToast(Toast.Style.Success, "Job Build Created");
                                } catch (error) {
                                  showToast(Toast.Style.Failure, "Build Job Failed", String(error));
                                }
                              },
                            },
                          };
                          await confirmAlert(options);
                        }}
                      />
                    )}
                    <Action.SubmitForm
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onSubmit={async () => {
                        await search(searchText);
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action.CopyToClipboard
                      icon={Icon.CopyClipboard}
                      title="Copy URL"
                      content={job.url}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  } else {
    return (
      <List
        navigationTitle={props.navigationTitle}
        isLoading={isLoading}
        onSearchTextChange={search}
        searchBarPlaceholder={"Search..."}
        throttle
      >
        <List.Section title="Results" subtitle={suggestions.length + ""}>
          {suggestions.map((suggestion) => (
            <List.Item
              key={suggestion.url}
              title={suggestion.name}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser title="Open in Browser" url={suggestion.url} />
                    <Action.SubmitForm
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onSubmit={async () => {
                        await search(searchText);
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action.CopyToClipboard
                      icon={Icon.CopyClipboard}
                      title="Copy URL"
                      content={suggestion.url}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }
}

interface BuildProps {
  jenkins: Jenkins;
  jobs: string[];
}

function Build(props: BuildProps) {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");

  const search = useCallback(
    async function search(text: string) {
      if (searchText !== text) {
        setSearchText(text);
      }
      setIsLoading(true);
      try {
        const jenkinsAPI = new JenkinsAPI(props.jenkins);
        const resp = await jenkinsAPI.inspect(props.jobs);
        setBuilds(resp.builds?.filter((build) => build.number.toString().includes(text)) ?? []);
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Search failed", message: String(error) });
      } finally {
        setIsLoading(false);
      }
    },
    [setBuilds]
  );

  useEffect(() => {
    search("");
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Builds - ${props.jobs.join(" / ")}`}
      onSearchTextChange={search}
      searchBarPlaceholder={"Search builds..."}
      throttle
    >
      <List.Section title="Results" subtitle={builds.length + ""}>
        {builds.map((build) => (
          <List.Item
            key={build.number}
            title={`#${build.number}`}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Browser" url={build.url} />
                  <Action.OpenInBrowser title="Console" url={`${build.url}console`} />
                  <Action.SubmitForm
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onSubmit={async () => {
                      await search(searchText);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.CopyClipboard}
                    title="Copy URL"
                    content={build.url}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
