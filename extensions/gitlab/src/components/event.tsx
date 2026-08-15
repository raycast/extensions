import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { Project, User, searchData } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { capitalizeFirstLetter, shortify } from "../utils";
import { DefaultActions, GitLabOpenInBrowserAction } from "./actions";
import { fetchEventsWithProjects } from "./events_data";
import { IssueDetailFetch } from "./issues";
import { MRDetailFetch } from "./mr";

export interface PushData {
  commit_count: number;
  action: string;
  ref_type: string;
  commit_from: string;
  commit_to: string;
  ref: string;
  commit_title: string;
  ref_count?: null;
}

export interface Note {
  noteable_iid?: number;
  noteable_id?: number;
  noteable_type?: string;
  body?: string;
}

export interface Event {
  id: number;
  project_id: number;
  action_name: string;
  target_id: number;
  target_iid: number;
  target_type: string;
  target_title: string;
  push_data?: PushData;
  note?: Note;
  author?: User;
  project?: Project;
}

export function EventListItem(props: { event: Event }) {
  let title = "";
  let subtitle: string | undefined = undefined;
  let icon: Image.ImageLike | undefined;
  let actionElement: React.ReactNode | undefined;
  switch (props.event.action_name) {
    case "updated":
      {
        const actionLabel = capitalizeFirstLetter(props.event.action_name);
        title = actionLabel;
        if (props.event.target_type) {
          const targetType = props.event.target_type.toLowerCase();
          if (targetType) {
            if (targetType === "wikipage::meta") {
              title = `${actionLabel} wiki page ${props.event.target_title}`;
              icon = { source: GitLabIcons.wiki, tintColor: Color.Green };
            }
          }
        }
      }
      break;
    case "pushed new":
    case "pushed to":
    case "deleted":
      {
        const actionLabel = capitalizeFirstLetter(props.event.action_name);
        if (props.event.push_data) {
          let iconColor: Color.ColorLike | undefined;
          switch (props.event.action_name) {
            case "pushed new":
              {
                iconColor = Color.Purple;
              }
              break;
            case "pushed to":
              {
                iconColor = Color.Green;
              }
              break;
            case "deleted":
              {
                iconColor = Color.Red;
              }
              break;
          }
          let iconSource: Image.Source | undefined;
          if (props.event.push_data.ref_type === "branch") {
            title = `${actionLabel} branch ${props.event.push_data.ref}`;
            iconSource = GitLabIcons.branches;
            if (props.event.project && props.event.action_name !== "deleted") {
              actionElement = (
                <DefaultActions
                  webAction={
                    <GitLabOpenInBrowserAction
                      url={`${props.event.project.web_url}/-/tree/${props.event.push_data.ref}`}
                      title="Open Branch in Browser"
                    />
                  }
                />
              );
            }
          } else if (props.event.push_data.ref_type === "tag") {
            title = `${actionLabel} tag ${props.event.push_data.ref}`;
            iconSource = GitLabIcons.tag;
          }
          icon = iconSource && { source: iconSource, tintColor: iconColor };
        }
      }
      break;
    case "created":
    case "joined":
      {
        const actionLabel = capitalizeFirstLetter(props.event.action_name);
        title = `${actionLabel} project`;
        icon = { source: Icon.Circle, tintColor: Color.Green };
        if (props.event.project) {
          title += ` ${props.event.project.fullPath}`;
        }
        if (props.event.project) {
          actionElement = (
            <DefaultActions
              webAction={
                <GitLabOpenInBrowserAction url={`${props.event.project.web_url}`} title="Open Project in Browser" />
              }
            />
          );
        }
      }
      break;
    case "accepted":
    case "commented on":
    case "opened":
    case "closed":
      {
        const actionLabel = capitalizeFirstLetter(props.event.action_name);
        if (props.event.target_type) {
          const targetType = props.event.target_type.toLowerCase();
          if (targetType === "issue") {
            title = `${actionLabel} issue #${props.event.target_iid}`;
            switch (props.event.action_name) {
              case "closed":
                {
                  icon = { source: GitLabIcons.issue, tintColor: Color.Red };
                  subtitle = shortify(props.event.target_title, 50);
                }
                break;
              case "opened":
                {
                  icon = { source: GitLabIcons.issue, tintColor: Color.Green };
                  subtitle = shortify(props.event.target_title, 50);
                }
                break;
              case "commented on":
                {
                  icon = { source: GitLabIcons.comment, tintColor: Color.Green };
                }
                break;
            }
            if (props.event.project) {
              actionElement = (
                <DefaultActions
                  action={
                    <Action.Push
                      title="Open Issue"
                      icon={{ source: GitLabIcons.issue, tintColor: Color.PrimaryText }}
                      target={<IssueDetailFetch project={props.event.project} issueId={props.event.target_iid} />}
                    />
                  }
                  webAction={
                    <GitLabOpenInBrowserAction
                      url={`${props.event.project.web_url}/-/issues/${props.event.target_iid}`}
                      title="Open Issue in Browser"
                    />
                  }
                />
              );
            }
          } else if (targetType == "mergerequest") {
            switch (props.event.action_name) {
              case "closed":
                {
                  icon = { source: GitLabIcons.merged, tintColor: Color.Purple };
                  subtitle = shortify(props.event.target_title, 50);
                }
                break;
              case "opened":
                {
                  icon = { source: GitLabIcons.mropen, tintColor: Color.Green };
                  subtitle = shortify(props.event.target_title, 50);
                }
                break;
              case "accepted":
                {
                  icon = { source: GitLabIcons.mraccepted, tintColor: Color.Green };
                  subtitle = shortify(props.event.target_title, 50);
                }
                break;
              case "commented on":
                {
                  icon = { source: GitLabIcons.comment, tintColor: Color.Green };
                  subtitle = shortify(props.event.target_title, 50);
                }
                break;
            }
            title = `${actionLabel} merge request !${props.event.target_iid}`;
            if (props.event.project) {
              actionElement = (
                <DefaultActions
                  action={
                    <Action.Push
                      title="Open Merge Request"
                      icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
                      target={<MRDetailFetch project={props.event.project} mrId={props.event.target_iid} />}
                    />
                  }
                  webAction={
                    <GitLabOpenInBrowserAction
                      url={`${props.event.project.web_url}/-/merge_requests/${props.event.target_iid}`}
                      title="Open Merge Request in Browser"
                    />
                  }
                />
              );
            }
          } else if (targetType === "milestone") {
            switch (props.event.action_name) {
              case "opened":
                {
                  icon = { source: GitLabIcons.milestone, tintColor: Color.Green };
                }
                break;
              case "closed":
                {
                  icon = { source: GitLabIcons.milestone, tintColor: Color.Purple };
                }
                break;
            }
            title = `${actionLabel} milestone ${props.event.target_title}`;
            if (props.event.project) {
              actionElement = (
                <DefaultActions
                  webAction={
                    <GitLabOpenInBrowserAction
                      url={`${props.event.project.web_url}/-/milestones/${props.event.target_iid}`}
                      title="Open Milestone in Browser"
                    />
                  }
                />
              );
            }
          } else if (targetType === "discussionnote") {
            switch (props.event.action_name) {
              case "opened":
                {
                  icon = { source: GitLabIcons.comment, tintColor: Color.Green };
                }
                break;
              case "closed":
                {
                  icon = { source: GitLabIcons.comment, tintColor: Color.Purple };
                }
                break;
              case "commented on":
                {
                  icon = { source: GitLabIcons.comment, tintColor: Color.Yellow };
                }
                break;
            }
            title = `${actionLabel} discussion note`;
            if (
              props.event.project &&
              props.event.target_iid &&
              props.event.note &&
              props.event.note.noteable_id &&
              props.event.note.noteable_type
            ) {
              let slug = "";
              const noteableType = props.event.note.noteable_type.toLowerCase();
              if (noteableType === "mergerequest" && props.event.note.noteable_iid) {
                slug = `/-/merge_requests/${props.event.note.noteable_iid}#note_${props.event.target_iid}`;
              } else if (noteableType === "issue" && props.event.note.noteable_iid) {
                slug = `/-/issues/${props.event.note.noteable_iid}#note_${props.event.target_iid}`;
              }
              if (slug) {
                actionElement = (
                  <DefaultActions
                    webAction={
                      <GitLabOpenInBrowserAction
                        url={`${props.event.project.web_url}${slug}`}
                        title="Open Comment in Browser"
                      />
                    }
                  />
                );
              }
            }
          } else if (targetType === "note" || targetType == "diffnote") {
            switch (props.event.action_name) {
              case "opened":
                {
                  icon = { source: GitLabIcons.comment, tintColor: Color.Green };
                }
                break;
              case "closed":
                {
                  icon = { source: GitLabIcons.comment, tintColor: Color.Purple };
                }
                break;
              case "commented on":
                {
                  if (props.event.note?.body !== undefined && props.event.note.body.length > 0) {
                    subtitle = shortify(props.event.note.body, 50);
                  }
                  icon = { source: GitLabIcons.comment, tintColor: Color.Yellow };
                }
                break;
            }
            title = `${actionLabel} note`;
            if (
              props.event.project &&
              props.event.target_iid &&
              props.event.note &&
              props.event.note.noteable_id &&
              props.event.note.noteable_type
            ) {
              let slug = "";
              const noteableType = props.event.note.noteable_type.toLowerCase();
              if (noteableType === "mergerequest" && props.event.note.noteable_iid) {
                slug = `/-/merge_requests/${props.event.note.noteable_iid}#note_${props.event.target_iid}`;
              } else if (noteableType === "issue" && props.event.note.noteable_iid) {
                slug = `/-/issues/${props.event.note.noteable_iid}#note_${props.event.target_iid}`;
              }
              if (slug) {
                actionElement = (
                  <DefaultActions
                    webAction={
                      <GitLabOpenInBrowserAction
                        url={`${props.event.project.web_url}${slug}`}
                        title="Open Comment in Browser"
                      />
                    }
                  />
                );
              }
            }
          } else {
            console.log(props.event);
          }
        } else {
          console.log(props.event);
        }
      }
      break;
    case "approved":
      {
        if (props.event.target_type) {
          const targetType = props.event.target_type.toLowerCase();
          if (targetType === "mergerequest") {
            title = `Approved Merge Request !${props.event.target_iid} "${props.event.target_title}"`;
            icon = { source: "approved.png", tintColor: Color.Green };
            if (props.event.project) {
              actionElement = (
                <DefaultActions
                  action={
                    <Action.Push
                      title="Open Merge Request"
                      icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
                      target={<MRDetailFetch project={props.event.project} mrId={props.event.target_iid} />}
                    />
                  }
                  webAction={
                    <GitLabOpenInBrowserAction
                      url={`${props.event.project.web_url}/-/merge_requests/${props.event.target_iid}`}
                      title="Open Merge Request in Browser"
                    />
                  }
                />
              );
            }
          }
        }
      }
      break;
    default:
      {
        console.log("unknown action_name");
        console.log(props.event);
      }
      break;
  }
  if (!title && !icon && !actionElement) {
    title = `Unknown event: ${props.event.action_name}`;
    icon = { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
    actionElement = (
      <Action.CopyToClipboard content={JSON.stringify(props.event, null, 2)} title="Copy Event Details" />
    );
  }

  return (
    <List.Item
      title={{ value: title || "", tooltip: props.event.target_title }}
      subtitle={subtitle}
      icon={icon}
      accessories={[
        { text: props.event.project?.name_with_namespace },
        {
          icon: props.event.author ? { source: props.event.author.avatar_url, mask: Image.Mask.Circle } : undefined,
          tooltip: props.event.author ? props.event.author.name : undefined,
        },
      ]}
      actions={<ActionPanel>{actionElement && actionElement}</ActionPanel>}
    />
  );
}

enum ScopeType {
  MyActivities = "my",
  MyProjects = "myprojects",
}

function EventListDropdown(props: { onChange: (text: string) => void }) {
  return (
    <List.Dropdown tooltip="Scope" onChange={props.onChange}>
      <List.Dropdown.Item value={ScopeType.MyActivities} title="My Activities" />
      <List.Dropdown.Item value={ScopeType.MyProjects} title="My Projects" />
    </List.Dropdown>
  );
}

function EventListEmptyView() {
  return <List.EmptyView title="No Activity" icon={{ source: GitLabIcons.activity, tintColor: Color.PrimaryText }} />;
}

export function EventList() {
  const [scope, setScope] = useState<string>(ScopeType.MyActivities);
  const [searchText, setSearchText] = useState<string>();
  const { data, isLoading } = useCachedPromise(
    async (scopeType: string): Promise<Event[]> => {
      const params: Record<string, string> = {};
      if (scopeType === ScopeType.MyProjects) {
        params.scope = "all";
      }
      return fetchEventsWithProjects(params);
    },
    [scope],
    { initialData: [] },
  );
  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<EventListDropdown onChange={setScope} />}
    >
      {searchData<Event>(data, {
        search: searchText || "",
        keys: ["action_name", "target_title"],
        limit: 50,
      }).map((event: Event) => (
        <EventListItem key={event.id} event={event} />
      ))}
      <EventListEmptyView />
    </List>
  );
}
