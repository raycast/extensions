export type preferences = {
  token: string;
  apitoken: string;
  username?: string;
};

export type postValues = {
  name: string;
  idList: string;
  due?: Date;
  desc?: string;
  idMember?: string[];
};
