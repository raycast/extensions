import client from "./client";
import moment from "moment";

export function convertTaskURL(taskUUID: string): string {
  return `${client.projectBaseURL}/task/${taskUUID}`;
}

export function convertSpaceURL(spaceUUID: string): string {
  return `${client.wikiBaseURL}/space/${spaceUUID}`;
}

export function convertPageURL(pageUUID: string): string {
  return `${client.wikiBaseURL}/page/${pageUUID}`;
}

export function convertResourceURL(resourceUUID: string): string {
  return `${client.projectBaseURL}/resource/${resourceUUID}`;
}

export function convertProjectURL(projectUUID: string): string {
  return `${client.projectBaseURL}/project/${projectUUID}`;
}

export function convertSprintURL(projectUUID: string, sprintUUID: string): string {
  return `${client.projectBaseURL}/project/${projectUUID}/sprint/${sprintUUID}`;
}

export const weekdays: { [key: number]: string } = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export function convertTimestamp(t: number, layout?: string): string {
  if (!layout) {
    layout = "YYYY-MM-DD";
  }
  return moment(t * 1000).format(layout);
}
