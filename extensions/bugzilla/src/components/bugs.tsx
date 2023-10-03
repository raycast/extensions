import { ActionPanel, Action, List, showToast, Toast, Icon, Color, Detail, getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { BugzillaAPI } from "../utils/api/bugzilla";
import { BugzillaInstance } from "../interfaces/bugzilla";
import { Bug } from "../interfaces/bug";
import { Preferences } from "../interfaces/preferences";
import { listBugzilla } from "../utils/api/storage";
import { ManageInstanceEmptyView } from "./manageInstance";

export interface FetchProps {
  bugs?: string[];
  currentUserSearchParam: string;
  navigationTitle: string;
  quicksearch?: boolean;
}

interface BugDetailsProps {
  bugzilla: BugzillaInstance;
  bug: Bug;
}

const bugzillaPreferences = getPreferenceValues<Preferences>();

interface DropdownProps {
  instanceList: BugzillaInstance[];
}

export function BugItem(props: BugDetailsProps): JSX.Element {
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
            <Detail.Metadata.TagList.Item key={details.bug.id} text={details.bug.status} color={Color.SecondaryText} />
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

export function QuicksearchBugs() {
  const searchParams = new Map<string, string>([["limit", bugzillaPreferences.bugs_limit]]);
  async function fetch(query: string) {
    if (selectedBugzilla !== undefined) {
      try {
        if (query) {
          setIsLoading(true);
          toast.message = query;
          toast.show();
          const bugzillaAPI = new BugzillaAPI(selectedBugzilla);
          const result = await bugzillaAPI.getBugs(searchParams, query);
          query ? setBugs(result.filter((bug: Bug) => bug ?? [])) : setBugs([]);
        } else {
          setBugs([]);
        }
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Query Failed",
          message: String(err),
        });
      } finally {
        toast.hide();
        setIsLoading(false);
      }
    }
  }
  function BugzillaDropdown({ instanceList }: DropdownProps) {
    return (
      <List.Dropdown
        tooltip="Select Bugzilla Instance"
        onChange={(value) => {
          setSelectedBugzilla(instanceList.find((i) => i.id === value));
        }}
        placeholder="Search Bugzilla Instance"
      >
        {instanceList.map((instance: BugzillaInstance) => (
          <List.Dropdown.Item key={instance.id} value={instance.id} title={instance.displayName} />
        ))}
      </List.Dropdown>
    );
  }
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [bugzillaList, setBugzillaList] = useState<BugzillaInstance[]>([]);
  const [selectedBugzilla, setSelectedBugzilla] = useState<BugzillaInstance>();
  const toast = new Toast({ style: Toast.Style.Animated, title: "Executing Query" });

  const loadInstances = useCallback(async function fetch() {
    setBugzillaList(await listBugzilla());
  }, []);

  useEffect(() => {
    loadInstances();
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetch("");
  }, [selectedBugzilla]);

  return (
    <List
      searchBarAccessory={<BugzillaDropdown instanceList={bugzillaList} />}
      navigationTitle="Quick Search"
      isLoading={isLoading}
      searchBarPlaceholder="Execute Quick Search Query"
      filtering={false}
      onSearchTextChange={fetch}
      throttle
    >
      {bugzillaList.length === 0 ? <ManageInstanceEmptyView /> : <></>}

      {selectedBugzilla !== undefined ? <List.EmptyView title="No Bugs Found" icon="Bugzilla.png" /> : <></>}
      {selectedBugzilla !== undefined ? (
        <List.Section title="Bugs" subtitle={bugs.length + ""}>
          {bugs.map((b) => (
            <BugItem bugzilla={selectedBugzilla} bug={b} key={b.id} />
          ))}
        </List.Section>
      ) : (
        <></>
      )}
    </List>
  );
}

export function FetchBugs(props: FetchProps) {
  const searchParams = new Map<string, string>([
    ["is_open", "false"],
    ["resolution", "---"],
    ["limit", bugzillaPreferences.bugs_limit],
  ]);
  async function fetch() {
    if (selectedBugzilla !== undefined) {
      try {
        setIsLoading(true);
        toast.show();
        const bugzillaAPI = new BugzillaAPI(selectedBugzilla);
        searchParams.set(props.currentUserSearchParam, selectedBugzilla.login);
        const result = await bugzillaAPI.getBugs(searchParams);
        setBugs(result.filter((bug: Bug) => bug ?? []));
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Query Failed",
          message: String(err),
        });
      } finally {
        toast.hide();
        setIsLoading(false);
      }
    }
  }
  function BugzillaDropdown({ instanceList }: DropdownProps) {
    return (
      <List.Dropdown
        tooltip="Select Bugzilla Instance"
        onChange={(value) => {
          setSelectedBugzilla(instanceList.find((i) => i.id === value));
        }}
        placeholder="Search Bugzilla Instance"
      >
        {instanceList.map((instance: BugzillaInstance) => (
          <List.Dropdown.Item key={instance.id} value={instance.id} title={instance.displayName} />
        ))}
      </List.Dropdown>
    );
  }
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [bugzillaList, setBugzillaList] = useState<BugzillaInstance[]>([]);
  const [selectedBugzilla, setSelectedBugzilla] = useState<BugzillaInstance>();
  const toast = new Toast({ style: Toast.Style.Animated, title: "Executing Query" });

  const loadInstances = useCallback(async function fetch() {
    setBugzillaList(await listBugzilla());
  }, []);

  useEffect(() => {
    loadInstances();
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [selectedBugzilla]);

  return (
    <List
      searchBarAccessory={<BugzillaDropdown instanceList={bugzillaList} />}
      navigationTitle={props.navigationTitle}
      isLoading={isLoading}
      searchBarPlaceholder="Filter Bug IDs"
    >
      {bugzillaList.length === 0 ? <ManageInstanceEmptyView /> : <></>}

      {selectedBugzilla !== undefined ? <List.EmptyView title={"No Bugs Found"} icon="Bugzilla.png" /> : <></>}
      {selectedBugzilla !== undefined ? (
        <List.Section title="Bugs" subtitle={bugs.length + ""}>
          {bugs.map((b) => (
            <BugItem bugzilla={selectedBugzilla} bug={b} key={b.id} />
          ))}
        </List.Section>
      ) : (
        <></>
      )}
    </List>
  );
}
