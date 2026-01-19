export type ConfluenceCurrentUser = {
  type: string;
  username: string;
  userKey: string;
  profilePicture: {
    path: string;
    width: number;
    height: number;
    isDefault: boolean;
  };
  displayName: string;
  _links: {
    base: string;
    context: string;
    self: string;
  };
  _expandable: {
    status: string;
  };
};
