export interface DocPageItem {
  id: string;
  doc_id: string;
  workspace_id: number;
  name: string;
  date_created: number;
  date_updated: number;
  content: string;
  creator_id: number;
  deleted: boolean;
  archived: boolean;
  protected: boolean;
  presentation_details: {
    show_contributor_header: boolean;
  };
}
