export type SearchResult = {
  fullpath: string;
  is_dir: boolean;
  mtime: number;
  name: string;
  repo_id: string;
  score: number;
  size: number | null;
  repo_name: string;
  repo_owner_email: string;
};
export type FileDetails = {
  type: string;
  id: string;
  name: string;
  permission: string;
  is_draft: boolean;
  has_draft: boolean;
  draft_file_path: string;
  mtime: number;
  last_modified: string;
  last_modifier_email: string;
  last_modifier_name: string;
  last_modifier_contact_email: string;
  last_modifier_avatar: string;
  size: number;
  starred: boolean;
  comment_total: number;
  can_edit: boolean;
};

export type ErrorResult =
  | {
      detail: string;
    }
  | {
      error_msg: string;
    }
  | {
      [key: string]: string[];
    };
