import { VISIBILITY } from "./constant";

export interface Preferences {
  openApi: string;
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

export interface MemoInfoResponse {
  id: number;
  rowStatus: string;
  creatorId: number;
  createdTs: number;
  updatedTs: number;
  content: string;
  visibility: string;
  pinned: boolean;
  displayTs: number;
  creator: {
    id: number;
    rowStatus: string;
    createdTs: number;
    updatedTs: number;
    username: string;
    role: string;
    email: string;
    nickname: string;
    openId: string;
    userSettingList: null;
  };
  resourceList: ResourceObj[];
}

export type TagResponse = string[];

export interface MeResponse {
  id: number;
  rowStatus: "NORMAL";
  createdTs: number;
  updatedTs: number;
  username: string;
  role: ROLE;
  email: string;
  nickname: string;
  openId: string;
  userSettingList: [
    {
      UserID: number;
      key: string;
      value: string;
    }
  ];
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
