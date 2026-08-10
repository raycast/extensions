import { LocalStorage, Toast, showToast } from "@raycast/api";
import { maxHeaderSize } from "http";
import { Project } from "../projects/types";
import { Task } from "../tasks/types";

export enum StatusType {
  "favorite",
  "hidden",
}

export const setStatus = async (object: Project | Task, status: StatusType): Promise<Project | Task | void> => {
  await LocalStorage.setItem(object.id.toString(), "favorite");
  object.status = status;
  return object;
};

export const removeStatus = async (object: Project | Task): Promise<boolean | void> => {
  await LocalStorage.removeItem(object.id.toString());

  return true;
};

export const getStatus = async (objectID: number): Promise<StatusType | undefined> => {
  const item = await LocalStorage.getItem(objectID.toString());
  switch (item) {
    case "favorite":
      return StatusType.favorite;
    case "hidden":
      return StatusType.hidden;
    default:
      return undefined;
  }
};
