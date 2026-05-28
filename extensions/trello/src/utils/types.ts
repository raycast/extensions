export type preferences = {
  token: string;
  apitoken: string;
  username?: string;
  closedboards: boolean;
  defaultOpenTarget: "web" | "app";
};

export type postValues = {
  name: string;
  idList: string;
  due?: Date | null;
  desc?: string;
  idMember?: string[];
};
