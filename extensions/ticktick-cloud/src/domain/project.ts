export interface Project {
  id: string;
  name: string;
  kind: "inbox" | "project";
  closed: boolean;
}
