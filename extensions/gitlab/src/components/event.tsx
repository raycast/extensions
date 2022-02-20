import { ActionPanel, Color, Icon, ImageLike, List, PushAction, showToast, ToastStyle } from "@raycast/api";
import React, { useState } from "react";
import { useCache } from "../cache";
import { getPrimaryActionPreference, gitlab, PrimaryAction } from "../common";
import { Project, searchData } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { capitalizeFirstLetter } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";
import { IssueDetailFetch } from "./issues";
import { MRDetailFetch } from "./mr";

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types */

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
}

function DefaultActions(props: {
  action?: JSX.Element | undefined | null;
  webAction?: JSX.Element | undefined | null;
}): JSX.Element | null {
  const action = props.action;
  const webAction = props.webAction;
  if (action || webAction) {
    if (getPrimaryActionPreference() === PrimaryAction.Detail) {
      return (
        <React.Fragment>
          {action}
          {webAction}
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment>
          {webAction}
          {action}
        </React.Fragment>
      );
    }
  }
  return null;
}

export function EventListItem(props: { event: Event }): JSX.Element {
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
    }
  );
  let title = "";
  let icon: ImageLike | undefined;
  const action_name = ev.action_name;
  let actionElement: JSX.Element | undefined;
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
          if (pd.ref_type === "branch") {
            const ref = pd.ref;
            title = `${an} branch ${ref}`;
            switch (ev.action_name) {
              case "pushed new":
                {
                  icon = { source: GitLabIcons.branches, tintColor: Color.Purple };
                }
                break;
              case "pushed to":
                {
                  icon = { source: GitLabIcons.branches, tintColor: Color.Green };
                }
                break;
              case "deleted":
                {
                  icon = { source: GitLabIcons.branches, tintColor: Color.Red };
                }
                break;
            }
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
          }
        }
      }
      break;
    case "created":
      {
        title = "Created project";
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
                    <PushAction
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
                    <PushAction
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
          } else if (tt === "note") {
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
    default:
      {
        console.log("unknown action_name");
        console.log(ev);
      }
      break;
  }
  const accessoryTitle = project && !error ? project.fullPath : undefined;

  return (
    <List.Item
      title={title || ""}
      icon={icon}
      accessoryTitle={accessoryTitle}
      actions={<ActionPanel>{actionElement && actionElement}</ActionPanel>}
    />
  );
}

export function EventList(): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { data, error, isLoading } = useCache<Event[]>(
    "events",
    async (): Promise<any[]> => {
      const result: Event[] = await gitlab.fetch("events").then((events) => {
        return events.map((ev: any) => ev as Event);
      });
      return result;
    },
    {
      deps: [searchText],
      secondsToRefetch: 60,
      onFilter: async (epics) => {
        return await searchData<Event>(epics, {
          search: searchText || "",
          keys: ["action_name", "target_title"],
          limit: 50,
        });
      },
    }
  );
  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Events", error);
  }

  if (!data) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }
  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      {data?.map((ev) => (
        <EventListItem key={ev.id} event={ev} />
      ))}
    </List>
  );
}
