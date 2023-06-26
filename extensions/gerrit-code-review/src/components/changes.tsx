import { ActionPanel, Action, List, showToast, Toast, Icon, Color, Detail } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { GerritAPI } from "../utils/api/gerrit";
import { Change, Label } from "../interfaces/change";
import { GerritInstance } from "../interfaces/gerrit";
import { User } from "../interfaces/user";
import { format, parseISO } from "date-fns";

const labelColors: Record<string, Color> = {
  none: Color.PrimaryText,
  rejected: Color.Red,
  approved: Color.Green,
  disliked: Color.Red,
  recommended: Color.Green,
};

interface ChangeProps {
  gerrit: GerritInstance;
  changes?: string[];
  navigationTitle: string;
}

interface PatchDetails {
  change: Change;
}

export function FetchChanges(props: ChangeProps) {
  const [changes, setChanges] = useState<Change[]>([]);
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
      }
      try {
        const gerritAPI = new GerritAPI(props.gerrit);
        const changes = await gerritAPI.getChanges(text);
        setChanges(changes.filter((change: Change) => change ?? []));
        toast.hide();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Fetch failed";
        toast.message = String(err);
      } finally {
        setIsLoading(false);
      }
    },
    [setChanges]
  );

  useEffect(() => {
    fetch("");
  }, []);

  return (
    <List
      navigationTitle={props.navigationTitle}
      isLoading={isLoading}
      onSearchTextChange={fetch}
      searchBarPlaceholder="Execute Gerrit Query"
      throttle
    >
      <List.Section title="Changes" subtitle={changes.length + ""}>
        {changes.map((change) => (
          <List.Item
            key={change.url}
            title={{
              value: `${change._number}`,
              tooltip: `Project: ${change.project}, Branch: ${change.branch}`,
            }}
            subtitle={{
              value: change.subject.length > 65 ? `${change.subject.substring(0, 62)}...` : `${change.subject}`,
              tooltip: `${change.subject}`,
            }}
            icon={{
              value: Icon.Person,
              tooltip: `Author: ${change.author.name}`,
            }}
            accessories={[
              change.apiWarnings.length > 0
                ? {
                    tooltip: `${change.apiWarnings}`,
                    icon: { source: Icon.Warning, tintColor: Color.Orange },
                  }
                : {},
              change.status != "MERGED" && change.submitRequirementsMet !== undefined
                ? {
                    tooltip: change.submitRequirementsMet ? "Change can be submitted" : "Change can not be submitted",
                    icon: change.submitRequirementsMet
                      ? { source: Icon.CheckCircle, tintColor: Color.Green }
                      : { source: Icon.XMarkCircle, tintColor: Color.Red },
                  }
                : {},
              change.unresolved_comment_count
                ? {
                    tooltip: `${change.unresolved_comment_count} unresolved comments`,
                    icon: { source: Icon.Bubble, tintColor: Color.Orange },
                    text: `${change.unresolved_comment_count}`,
                  }
                : {},
              change.status == "NEW" && !change.work_in_progress
                ? {
                    tooltip: "Active",
                    tag: { value: "Active", color: Color.Blue },
                  }
                : {},
              change.status == "MERGED"
                ? {
                    tooltip: "Merged",
                    tag: { value: "Merged", color: Color.Green },
                  }
                : {},
              change.status == "ABANDONED"
                ? {
                    tooltip: "Abandoned",
                    tag: { value: "Abandoned", color: Color.Red },
                  }
                : {},
              change.work_in_progress
                ? {
                    tooltip: "Work In Progress",
                    tag: { value: "WIP", color: Color.Brown },
                  }
                : {},
              {
                tooltip: `Updated: ${format(parseISO(change.updated.toString()), "EEEE d MMMM yyyy 'at' HH:mm")} UTC`,
                date: new Date(change.updated),
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push icon={Icon.Info} title="Show Details" target={<PatchDetails change={change} />} />
                  <Action.OpenInBrowser title="Open in Browser" url={change.url} />
                  <Action.SubmitForm
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onSubmit={async () => {
                      await fetch(queryText);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.CopyClipboard}
                    title="Copy URL"
                    content={change.url}
                    shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
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

function PatchDetails(details: PatchDetails) {
  return (
    <Detail
      navigationTitle={details.change.ref}
      markdown={`# ${details.change.subject}\n${details.change.commitMessage}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            {details.change.status != "MERGED" && details.change.submitRequirementsMet ? (
              <Detail.Metadata.TagList.Item key="submittable" text={"Ready To Submit"} color={Color.Green} />
            ) : (
              <></>
            )}
            {!details.change.mergeable && details.change.status != "MERGED" ? (
              <Detail.Metadata.TagList.Item key="conflict" text={"Merge Conflict"} color={Color.Red} />
            ) : (
              <></>
            )}
            {details.change.status == "NEW" && !details.change.work_in_progress ? (
              <Detail.Metadata.TagList.Item key="new" text={"Active"} color={Color.Blue} />
            ) : (
              <></>
            )}
            {details.change.status == "MERGED" ? (
              <Detail.Metadata.TagList.Item key="merged" text={"Merged"} color={Color.Green} />
            ) : (
              <></>
            )}
            {details.change.status == "ABANDONED" ? (
              <Detail.Metadata.TagList.Item key="abandoned" text={"Abandoned"} color={Color.Red} />
            ) : (
              <></>
            )}
            {details.change.work_in_progress ? (
              <Detail.Metadata.TagList.Item key="wip" text={"WIP"} color={Color.Brown} />
            ) : (
              <></>
            )}
            {details.change.is_private ? (
              <Detail.Metadata.TagList.Item key="private" text={"Private"} color={Color.Purple} />
            ) : (
              <></>
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Submit Requirements">
            {details.change.calculatedVoteLabels ? (
              details.change.calculatedVoteLabels.map((l: Label) => (
                <Detail.Metadata.TagList.Item
                  key={l.name}
                  text={`${l.name}: ${(l.value <= 0 ? "" : "+") + l.value}`}
                  color={labelColors[l.status]}
                />
              ))
            ) : (
              <></>
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Project | Branch"
            text={`${details.change.project} | ${details.change.branch}`}
          />
          <Detail.Metadata.Label
            title="Updated (UTC)"
            text={`${format(parseISO(details.change.updated.toString()), "EEEE d MMMM yyyy 'at' HH:mm")}`}
          />
          <Detail.Metadata.TagList title="Owner">
            <Detail.Metadata.TagList.Item
              key="owner"
              text={`${details.change.owner.name} <${details.change.owner.email}>`}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Author">
            <Detail.Metadata.TagList.Item
              key="author"
              text={`${details.change.author.name} <${details.change.author.email}>`}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Uploader">
            <Detail.Metadata.TagList.Item
              key="uploader"
              text={`${details.change.uploader.name} <${details.change.uploader.email}>`}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Commiter">
            <Detail.Metadata.TagList.Item
              key="commiter"
              text={`${details.change.committer.name} <${details.change.committer.email}>`}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Reviewers">
            {details.change.changeReviewers ? (
              details.change.changeReviewers.map((u: User) => (
                <Detail.Metadata.TagList.Item
                  key={`${u.name}-${u.email}`}
                  text={`${u.name} <${u.email ? u.email : ""}>`}
                />
              ))
            ) : (
              <></>
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Topic">
            {details.change.topic ? (
              <Detail.Metadata.TagList.Item key={details.change.topic} text={details.change.topic} />
            ) : (
              <></>
            )}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={details.change.url} />
            <Action.CopyToClipboard
              icon={Icon.CopyClipboard}
              title="Copy URL"
              content={details.change.url}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
