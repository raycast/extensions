import { VISIBILITY } from "./constant";

export interface Preferences {
  openApi?: string;
  host?: string;
  token?: string;
}

export enum ROLE {
  HOST = "HOST",
  USER = "USER",
}

export enum ROW_STATUS {
  NORMAL = "NORMAL",
  ARCHIVED = "ARCHIVED",
}

export type ROW_STATUS_KEY = keyof typeof ROW_STATUS;

export interface ResponseData<T> {
  data: T;
}

export interface PostMemoParams {
  content: string;
  visibility: keyof typeof VISIBILITY;
  resourceIdList: number[];
}

export interface AttachmentObj {
  name: string;
  createTime: string;
  filename: string;
  externalLink: string;
  type: string;
  size: string;
  content?: string;
  memo?: string;
}

export interface MemoInfoResponse {
  name: string;
  state: string;
  creator: string;
  createTime: string;
  updateTime: string;
  displayTime: string;
  content: string;
  markdown?: string;
  visibility: string;
  pinned: boolean;
  displayTs: number;
  attachments: AttachmentObj[];
  tags: string[];
  property: {
    hasLink: boolean;
    hasTaskList: boolean;
    hasCode: boolean;
    hasIncompleteTasks: boolean;
  };
}

export interface MeResponse {
  user: {
    name: string;
    rowStatus: "ACTIVE";
    createdTime: number;
    updatedTime: number;
    username: string;
    role: ROLE;
    email: string;
    displayName: string;
  };
}

export interface PostFileResponse {
  id: number;
  creatorId: number;
  createdTs: string;
  updatedTs: number;
  filename: string;
  externalLink: string;
  type: string;
  size: string;
  linkedMemoAmount: number;
}
