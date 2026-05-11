export type PcloudSearchResponse = {
  result: number;
  total: number;
  items: Array<PcloudFileResponse>;
};

export type PcloudFileResponse = {
  name: string;
  created: string;
  thumb: boolean;
  modified: string;
  isfolder: boolean;
  fileid: number;
  hash: number;
  comments: number;
  category: number;
  id: string;
  isshared: boolean;
  ismine: boolean;
  size: number;
  parentfolderid: number;
  contenttype: string;
  icon: number;
};

export type PcloudBreadcrumb = {
  breadcrumb: Array<{
    metadata: {
      path: string;
      name: string;
      created: string;
      ismine: boolean;
      thumb: boolean;
      modified: string;
      id: string;
      isshared: boolean;
      icon: string;
      isfolder: boolean;
      folderid: number;
    };
  }>;
};

export type IFile = {
  id: string;
  name: string;
  path: string;
  icon: string;
  title: {
    value: string;
    tooltip: string;
  };
  accessories: Array<{
    date?: Date;
    text?: string;
    tag?: string;
  }>;
  context: PcloudFileResponse;
};
