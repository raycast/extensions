export interface SiYuanNote {
  id: string;
  title: string;
  content: string;
  path: string;
  box: string;
  created: string;
  updated: string;
  type: string;
  subType?: string;
  tags?: string[];
}

export interface SiYuanBlock {
  id: string;
  parentID: string;
  rootID: string;
  type: string;
  subType?: string;
  content: string;
  markdown: string;
  path: string;
  name: string;
  alias: string;
  memo: string;
  tag: string;
  created: string;
  updated: string;
  box: string;
  // 扩展字段：文档标题和路径（用于搜索结果显示）
  doc_title?: string;
  doc_path?: string;
  // 笔记本信息
  notebook_name?: string;
  notebook_id?: string;
  // 标识是否为文档（用于搜索结果区分）
  isDocument?: boolean;
  // 其他可能的字段
  hpath?: string;
  length?: number;
  root_id?: string;
  parent_id?: string;
  fcontent?: string;
  hash?: string;
  ial?: string;
  sort?: number;
  subtype?: string;
}

export interface SiYuanSearchResult {
  blocks: SiYuanBlock[];
  matchedBlockCount: number;
  matchedRootCount: number;
  pageCount: 1;
  matchedPaths?: string[]; // 匹配的文档路径
  matchedNotebooks?: string[]; // 匹配的笔记本ID
}

export interface SiYuanNotebook {
  id: string;
  name: string;
  icon: string;
  sort: number;
  closed: boolean;
}

export interface SiYuanTemplate {
  id: string;
  name: string;
  content: string;
  path: string;
}

export interface CreateNoteParams {
  notebook: string;
  path: string;
  title: string;
  content?: string;
  template?: string;
}

export interface SiYuanApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}
