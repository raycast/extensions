import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import { useCache } from "../cache";
import { gitlab } from "../common";
import { Project, User, searchData } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { capitalizeFirstLetter, daysInSeconds, showErrorToast } from "../utils";
import { DefaultActions, GitLabOpenInBrowserAction } from "./actions";
import { CacheActionPanelSection } from "./cache_actions";
import { IssueDetailFetch } from "./issues";
import { MRDetailFetch } from "./mr";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
}

export function EventListItem(props: { event: Event }) {
  const ev = props.event;
  const { data: project, error } = useCache<Project | undefined>(
    `event_project_${ev.project_id}`,
    async (): Promise<Project | undefined> => {
      const pro = await gitlab.getProject(ev.project_id);
      return pro;
    },
    {
      deps: [ev.project_id],
      secondsToRefetch: 15 * 60,
      secondsToInvalid: daysInSeconds(7),
    },
  );
  let title = "";
  let icon: Image.ImageLike | undefined;
  const action_name = ev.action_name;
  let actionElement: React.ReactNode | undefined;
  switch (action_name) {
    case "updated":
      {
        const an = capitalizeFirstLetter(ev.action_name);
        title = an;
        if (ev.target_type) {
          const tt = ev.target_type.toLowerCase();
          if (tt) {
            if (tt === "wikipage::meta") {
              title = `${an} wiki page ${ev.target_title}`;
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
        const an = capitalizeFirstLetter(ev.action_name);
        const pd = ev.push_data;
        if (pd) {
          let iconColor: Color.ColorLike | undefined;
          switch (ev.action_name) {
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
          if (pd.ref_type === "branch") {
            const ref = pd.ref;
            title = `${an} branch ${ref}`;
            iconSource = GitLabIcons.branches;
            if (project && !error && ev.action_name !== "deleted") {
              actionElement = (
                <DefaultActions
                  webAction={
                    <GitLabOpenInBrowserAction
                      url={`${project.web_url}/-/tree/${ref}`}
                      title="Open Branch in Browser"
                    />
                  }
                />
              );
            }
          } else if (pd.ref_type === "tag") {
            title = `${an} tag ${pd.ref}`;
            iconSource = GitLabIcons.tag;
          }
          icon = iconSource && { source: iconSource, tintColor: iconColor };
        }
      }
      break;
    case "created":
    case "joined":
      {
        const an = capitalizeFirstLetter(ev.action_name);
        title = `${an} project`;
        icon = { source: Icon.Circle, tintColor: Color.Green };
        if (project && !error) {
          title += ` ${project.fullPath}`;
        }
        if (project && !error && ev.action_name !== "deleted") {
          actionElement = (
            <DefaultActions
              webAction={<GitLabOpenInBrowserAction url={`${project.web_url}`} title="Open Project in Browser" />}
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
        const an = capitalizeFirstLetter(ev.action_name);
        if (ev.target_type) {
          const tt = ev.target_type.toLowerCase();
          if (tt === "issue") {
            title = `${an} issue #${ev.target_iid}`;
            switch (ev.action_name) {
              case "closed":
                {
                  icon = { source: GitLabIcons.issue, tintColor: Color.Red };
                }
                break;
              case "opened":
                {
                  icon = { source: GitLabIcons.issue, tintColor: Color.Green };
                }
                break;
              case "commented on":
                {
                  icon = { source: GitLabIcons.comment, tintColor: Color.Green };
                }
                break;
            }
            if (project && !error) {
              actionElement = (
                <DefaultActions
                  action={
                    <Action.Push
                      title="Open Issue"
                      icon={{ source: GitLabIcons.issue, tintColor: Color.PrimaryText }}
                      target={<IssueDetailFetch project={project} issueId={ev.target_iid} />}
                    />
                  }
                  webAction={
                    <GitLabOpenInBrowserAction
                      url={`${project.web_url}/-/issues/${ev.target_iid}`}
                      title="Open Issue in Browser"
                    />
                  }
                />
              );
            }
          } else if (tt == "mergerequest") {
            switch (ev.action_name) {
              case "closed":
                {
                  icon = { source: GitLabIcons.merged, tintColor: Color.Purple };
                }
                break;
              case "opened":
                {
                  icon = { source: GitLabIcons.mropen, tintColor: Color.Green };
                }
                break;
              case "accepted":
                {
                  icon = { source: GitLabIcons.mraccepted, tintColor: Color.Green };
                }
                break;
              case "commented on":
                {
                  icon = { source: GitLabIcons.comment, tintColor: Color.Green };
                }
                break;
            }
            title = `${an} merge request !${ev.target_iid}`;
            if (project && !error) {
              actionElement = (
                <DefaultActions
                  action={
                    <Action.Push
                      title="Open Merge Request"
                      icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
                      target={<MRDetailFetch project={project} mrId={ev.target_iid} />}
                    />
                  }
                  webAction={
                    <GitLabOpenInBrowserAction
                      url={`${project.web_url}/-/merge_requests/${ev.target_iid}`}
                      title="Open Merge Request in Browser"
                    />
                  }
                />
              );
            }
          } else if (tt === "milestone") {
            switch (ev.action_name) {
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
            title = `${an} milestone ${ev.target_title}`;
            if (project && !error) {
              actionElement = (
                <DefaultActions
                  webAction={
                    <GitLabOpenInBrowserAction
                      url={`${project.web_url}/-/milestones/${ev.target_iid}`}
                      title="Open Milestone in Browser"
                    />
                  }
                />
              );
            }
          } else if (tt === "discussionnote") {
            switch (ev.action_name) {
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
            title = `${an} discussion note`;
            if (!error && project && ev.target_iid && ev.note && ev.note.noteable_id && ev.note.noteable_type) {
              let slug = "";
              const nt = ev.note.noteable_type.toLowerCase();
              if (nt === "mergerequest" && ev.note && ev.note.noteable_iid) {
                slug = `/-/merge_requests/${ev.note.noteable_iid}#note_${ev.target_iid}`;
              } else if (nt === "issue" && ev.note && ev.note.noteable_iid) {
                slug = `/-/issues/${ev.note.noteable_iid}#note_${ev.target_iid}`;
              }
              if (slug) {
                actionElement = (
                  <DefaultActions
                    webAction={
                      <GitLabOpenInBrowserAction url={`${project.web_url}${slug}`} title="Open Comment in Browser" />
                    }
                  />
                );
              }
            }
          } else if (tt === "note" || tt == "diffnote") {
            switch (ev.action_name) {
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
            title = `${an} note`;
            if (!error && project && ev.target_iid && ev.note && ev.note.noteable_id && ev.note.noteable_type) {
              let slug = "";
              const nt = ev.note.noteable_type.toLowerCase();
              if (nt === "mergerequest" && ev.note && ev.note.noteable_iid) {
                slug = `/-/merge_requests/${ev.note.noteable_iid}#note_${ev.target_iid}`;
              } else if (nt === "issue" && ev.note && ev.note.noteable_iid) {
                slug = `/-/issues/${ev.note.noteable_iid}#note_${ev.target_iid}`;
              }
              if (slug) {
                actionElement = (
                  <DefaultActions
                    webAction={
                      <GitLabOpenInBrowserAction url={`${project.web_url}${slug}`} title="Open Comment in Browser" />
                    }
                  />
                );
              }
            }
          } else {
            console.log(ev);
          }
        } else {
          console.log(ev);
        }
      }
      break;
    case "approved":
      {
        if (ev.target_type) {
          const tt = ev.target_type.toLowerCase();
          if (tt === "mergerequest") {
            const target_title = ev.target_title;
            const mrIId = ev.target_iid;
            title = `Approved Merge Request !${mrIId} "${target_title}"`;
            icon = { source: "approved.png", tintColor: Color.Green };
            if (project) {
              const slug = `/-/merge_requests/${mrIId}`;
              actionElement = (
                <DefaultActions
                  action={
                    <Action.Push
                      title="Open Merge Request"
                      icon={{ source: GitLabIcons.merge_request, tintColor: Color.PrimaryText }}
                      target={<MRDetailFetch project={project} mrId={mrIId} />}
                    />
                  }
                  webAction={
                    <GitLabOpenInBrowserAction
                      url={`${project.web_url}${slug}`}
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
        console.log(ev);
      }
      break;
  }
  if (!title && !icon && !actionElement) {
    title = `Unknown event: ${action_name}`;
    icon = { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
    actionElement = <Action.CopyToClipboard content={JSON.stringify(ev, null, 2)} title="Copy Event Details" />;
  }
  const accessoryTitle = project && !error ? project.fullPath : undefined;

  return (
    <List.Item
      title={{ value: title || "", tooltip: ev.target_title }}
      icon={icon}
      accessories={[
        { text: accessoryTitle },
        {
          icon: ev.author ? { source: ev.author.avatar_url, mask: Image.Mask.Circle } : undefined,
          tooltip: ev.author ? ev.author.name : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          {actionElement && actionElement}
          {actionElement && <CacheActionPanelSection />}
        </ActionPanel>
      }
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
  const params: Record<string, any> = {};
  if (scope === ScopeType.MyProjects) {
    params.scope = "all";
  }
  const { data, error, isLoading } = useCache<Event[]>(
    `events_${scope}`,
    async (): Promise<any[]> => {
      const result: Event[] = await gitlab.fetch("events", params).then((events) => {
        return events.map((ev: any) => ev as Event);
      });
      return result;
    },
    {
      deps: [searchText, scope],
      secondsToRefetch: 60,
      onFilter: async (epics) => {
        return searchData<Event>(epics, {
          search: searchText || "",
          keys: ["action_name", "target_title"],
          limit: 50,
        });
      },
    },
  );
  if (error) {
    showErrorToast(error, "Cannot search Events");
  }

  if (!data) {
    return <List isLoading={true} />;
  }
  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<EventListDropdown onChange={setScope} />}
    >
      {data?.map((ev) => (
        <EventListItem key={ev.id} event={ev} />
      ))}
      <EventListEmptyView />
    </List>
  );
}
