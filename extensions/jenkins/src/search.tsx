import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { JenkinsAPI, Jenkins, Job, hasSubJobs } from "./lib/api";

export function SearchJob(props: { jenkins: Jenkins; jobs?: string[]; mode: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const search = useCallback(
    async function search(text: string) {
      setIsLoading(true);
      try {
        const jenkinsAPI = new JenkinsAPI(props.jenkins);
        let jobs: Job[] = [];
        if (props.mode === "normal") {
          const resp = await jenkinsAPI.inspect(props.jobs);
          jobs = resp.jobs?.filter((job) => job.name.toLowerCase().includes(text.toLowerCase())) ?? [];
        } else {
          if (text !== "") {
            const resp = await jenkinsAPI.search(text);
            jobs = resp.suggestions;
          }
        }
        setJobs(jobs);
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Search job failed", message: String(error) });
      } finally {
        setIsLoading(false);
      }
    },
    [setJobs]
  );

  useEffect(() => {
    search("");
  }, []);

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Search jobs..." throttle>
      <List.Section title="Results" subtitle={jobs.length + ""}>
        {jobs.map((job) => (
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
                      target={
                        <SearchJob
                          jenkins={props.jenkins}
                          jobs={[...(props.jobs ?? []), job.path ?? ""]}
                          mode={props.mode}
                        />
                      }
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
