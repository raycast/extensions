import { ActionPanel, Action, List, showToast, Toast, Icon, Color, Detail } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { BugzillaAPI } from "../utils/api/bugzilla";
import { BugzillaInstance } from "../interfaces/bugzilla";
import { Bug } from "../interfaces/bug";

interface BugProps {
  bugzilla: BugzillaInstance;
  bugs?: string[];
  searchParams: Map<string, string>;
  navigationTitle: string;
  quicksearch?: boolean;
}

interface BugDetailsProps {
  bugzilla: BugzillaInstance;
  bug: Bug;
}

function BugItem(props: BugDetailsProps): JSX.Element {
  return (
    <List.Item
      key={props.bug.id}
      title={{
        value: `${props.bug.id}`,
        tooltip: `Product: ${props.bug.product}, Version: ${props.bug.version}, Component: ${props.bug.component}`,
      }}
      subtitle={{
        value: props.bug.summary.length > 65 ? `${props.bug.summary.substring(0, 62)}...` : `${props.bug.summary}`,
        tooltip: `${props.bug.summary}`,
      }}
      icon={{
        value: Icon.Person,
        tooltip: `Assignee: ${props.bug.assigned_to}, Reporter: ${props.bug.creator}`,
      }}
      accessories={[
        props.bug.severity == "unspecified"
          ? {
              tooltip: `Severity: ${props.bug.severity}, Priority: ${props.bug.priority}`,
              icon: { source: Icon.FullSignal, tintColor: "#959a9a" },
            }
          : {},
        props.bug.severity == "low"
          ? {
              tooltip: `Severity: ${props.bug.severity}, Priority: ${props.bug.priority}`,
              icon: { source: Icon.Signal1, tintColor: Color.Green },
            }
          : {},
        props.bug.severity == "medium"
          ? {
              tooltip: `Severity: ${props.bug.severity}, Priority: ${props.bug.priority}`,
              icon: { source: Icon.Signal2, tintColor: Color.Yellow },
            }
          : {},
        props.bug.severity == "high"
          ? {
              tooltip: `Severity: ${props.bug.severity}, Priority: ${props.bug.priority}`,
              icon: { source: Icon.Signal3, tintColor: Color.Orange },
            }
          : {},
        props.bug.severity == "urgent"
          ? {
              tooltip: `Severity: ${props.bug.severity}, Priority: ${props.bug.priority}`,
              icon: { source: Icon.FullSignal, tintColor: Color.Red },
            }
          : {},
        {
          tooltip: props.bug.status,
          tag: { value: props.bug.status, color: props.bug.is_open ? Color.SecondaryText : Color.Red },
        },
        {
          tooltip: `Modified: ${props.bug.last_change_date_locale}`,
          date: props.bug.last_change_date_locale,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Bug">
            <Action.Push
              icon={Icon.Info}
              title="Show Details"
              target={<BugDetails bugzilla={props.bugzilla} bug={props.bug} />}
            />
            <Action.OpenInBrowser title="Open in Browser" url={props.bug.bug_url} />
          </ActionPanel.Section>
          <ActionPanel.Section title="URL">
            <Action.CopyToClipboard
              icon={Icon.CopyClipboard}
              title="Copy URL"
              content={props.bug.bug_url}
              shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function BugDetails(details: BugDetailsProps): JSX.Element {
  const [description, setDescription] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetch = useCallback(
    async function fetch() {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching Additional Details",
      });
      try {
        const bugzillaAPI = new BugzillaAPI(details.bugzilla);
        const description = await bugzillaAPI.getDetails(details.bug.id);
        setDescription(description);
        toast.hide();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to fetch details";
        toast.message = String(err);
      } finally {
        setIsLoading(false);
      }
    },
    [setDescription]
  );
  useEffect(() => {
    fetch();
  }, []);

  return (
    <Detail
      navigationTitle={details.bug.summary}
      isLoading={isLoading}
      markdown={`# ${details.bug.summary}\n${description ? description : ""}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item key="submittable" text={details.bug.status} color={Color.SecondaryText} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Product" text={`${details.bug.product}`} />
          <Detail.Metadata.Label title="Version" text={`${details.bug.version}`} />
          <Detail.Metadata.Label title="Component" text={`${details.bug.component}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Reported"
            text={`${details.bug.creation_date_locale} by ${details.bug.creator}`}
          />
          <Detail.Metadata.Label title="Modified" text={`${details.bug.last_change_date_locale}`} />
          <Detail.Metadata.Separator />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Bug">
            <Action.OpenInBrowser title="Open in Browser" url={details.bug.bug_url} />
          </ActionPanel.Section>
          <ActionPanel.Section title="URL">
            <Action.CopyToClipboard
              icon={Icon.CopyClipboard}
              title="Copy URL"
              content={details.bug.bug_url}
              shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function QuicksearchBugs(props: BugProps) {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [queryText, setSearchText] = useState<string>("");

  const fetch = useCallback(
    async function fetch(text: string) {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Executing Query",
      });
      if (queryText !== text) {
        setSearchText(text);
        toast.message = text;
      } else {
        setSearchText("");
      }
      try {
        const bugzillaAPI = new BugzillaAPI(props.bugzilla);
        const bugs = text ? await bugzillaAPI.getBugs(props.searchParams, text) : [];
        text ? setBugs(bugs.filter((bug: Bug) => bug ?? [])) : setBugs([]);
        toast.hide();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Fetch failed";
        toast.message = String(err);
      } finally {
        setIsLoading(false);
      }
    },
    [setBugs]
  );

  // If not cleared, when clearing search it sends an API call :(
  // Needs to fix
  useEffect(() => {
    setIsLoading(false);
  }, []);

  return (
    <List
      navigationTitle={props.navigationTitle}
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={fetch}
      searchBarPlaceholder="Execute Quick Search Query"
      throttle
    >
      <List.EmptyView title={queryText && !isLoading ? "No Bugs Found" : "No Query"} icon="Bugzilla.png" />
      <List.Section title="Bugs" subtitle={bugs.length + ""}>
        {bugs.map((b) => (
          <BugItem bugzilla={props.bugzilla} bug={b} />
        ))}
      </List.Section>
    </List>
  );
}

export function FetchBugs(props: BugProps) {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetch = useCallback(
    async function fetch() {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Executing Query",
      });
      try {
        const bugzillaAPI = new BugzillaAPI(props.bugzilla);
        const bugs = await bugzillaAPI.getBugs(props.searchParams);
        setBugs(bugs.filter((bug: Bug) => bug ?? []));
        toast.hide();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Fetch failed";
        toast.message = String(err);
      } finally {
        setIsLoading(false);
      }
    },
    [setBugs]
  );

  useEffect(() => {
    fetch();
  }, []);

  return (
    <List navigationTitle={props.navigationTitle} isLoading={isLoading} searchBarPlaceholder="Filter Bug IDs">
      <List.EmptyView title={"No Bugs Found"} icon="Bugzilla.png" />
      <List.Section title="Bugs" subtitle={bugs.length + ""}>
        {bugs.map((b) => (
          <BugItem bugzilla={props.bugzilla} bug={b} />
        ))}
      </List.Section>
    </List>
  );
}
