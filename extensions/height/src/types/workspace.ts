export type WorkspaceObject = {
  id: string;
  model: "workspace";
  name: string;
  createdUserId: string;
  key: string;
  planType: string;
  url: string;
  hue: number;
  iconUrl: string | null;
};
