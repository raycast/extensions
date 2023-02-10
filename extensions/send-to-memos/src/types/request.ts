import { VISIBILITY } from "../utils/constant";

export enum ROLE {
  HOST = "HOST",
  USER = "USER",
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
  data: {
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
  };
}

export interface TagResponse {
  data: string[];
}

export interface MeResponse {
  data: {
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
  };
}

export interface PostFileResponse {
  data: {
    id: number;
    creatorId: number;
    createdTs: number;
    updatedTs: number;
    filename: string;
    externalLink: string;
    type: string;
    size: number;
    linkedMemoAmount: number;
  };
}
