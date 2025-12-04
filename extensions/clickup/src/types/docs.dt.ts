export interface DocsResponse {
  docs: DocItem[];
}
export interface DocItem {
  id: string;
  date_created: number;
  date_updated: number;
  name: string;
  parent: {
    id: string;
    type: number;
  };
  public: boolean;
  workspace_id: number;
  creator: number;
  deleted: boolean;
  type: number;
}
