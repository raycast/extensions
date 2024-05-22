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

interface ResourceObj {
  uid: string;
  name: string;
  createTime: number;
  filename: string;
  externalLink: string;
  type: string;
  size: number;
  linkedMemoAmount: number;
}

export interface MemoInfoResponse {
  uid: string;
  name: string;
  rowStatus: string;
  creator: string;
  createTime: string;
  updateTime: string;
  displayTime: string;
  content: string;
  visibility: string;
  pinned: boolean;
  displayTs: number;
  resources: ResourceObj[];
}

export type TagResponse = string[];

export interface MeResponse {
  id: number;
  name: string;
  rowStatus: "ACTIVE";
  createdTime: number;
  updatedTime: number;
  username: string;
  role: ROLE;
  email: string;
  nickname: string;
}

export interface PostFileResponse {
  id: number;
  creatorId: number;
  createdTs: number;
  updatedTs: number;
  filename: string;
  externalLink: string;
  type: string;
  size: number;
  linkedMemoAmount: number;
}
