export interface Change {
  id: string;
  project: string;
  branch: string;
  topic?: string;
  attention_set?: object;
  removed_from_attention_set?: object;
  hashtags?: object;
  change_id: string;
  subject: string;
  status: string;
  created: string;
  updated: string;
  submitted?: string;
  submitter?: User;
  starred?: boolean;
  stars?: string[];
  reviewed?: boolean;
  submit_type?: string;
  mergeable?: boolean;
  insertions: number;
  deletions: number;
  total_comment_count?: number;
  unresolved_comment_count?: number;
  has_review_started?: boolean;
  _number: number;
  owner: User;
  action?: object;
  submit_records: object[];
  requirements: string[];
  submit_requirements?: ChangeSubmitRequirement[];
  labels: ChangeLabels;
  permitted_labels?: object[];
  removable_labels?: object[];
  removable_reviewers?: object[];
  reviewers: ChangeReviewers;
  pending_reviewers?: object;
  reviewer_updates?: object;
  messages?: object[];
  current_revision: string;
  revisions: ChangeRevision;
  meta_rev_id?: string;
  tracking_ids?: object[];
  _more_changes?: boolean;
  problems?: object[];
  is_private?: boolean;
  work_in_progress?: boolean;
  base_change?: string;
  base_commit?: string;
  new_branch?: boolean;
  validation_options?: object;
  merge?: object;
  patch?: string;
  author: User;

  url: string; // Custom value populated by extension
  changeReviewers?: User[]; // Custom value populated by extension
  calculatedVoteLabels: Label[]; // Custom value populated by extension
  committer: User; // Custom value populated by extension
  uploader: User; // Custom value populated by extension
  commitMessage: string; // Custom value populated by extension
  submitRequirementsMet: boolean | undefined; // Custom value populated by extension
  mergeConflict: false; // Custom value populated by extension
  mergeConflict: boolean; // Custom value populated by extension
  ref: string; // Custom value populated by extension
  apiWarnings: string[]; // Custom value populated by extension
}

export interface ChangeReviewers {
  [key: string]: User[];
}

export interface ChangeRevision {
  [key: string]: ChangeRevision;
  kind: string;
  _number: number;
  created: string;
  uploader: User;
  ref: string;
  fetch: object;
  commit: ChangeRevisionCommit;
}

export interface ChangeRevisionCommit {
  parents: object[];
  author: User;
  committer: User;
  subject: string;
  message: string;
}

export interface ChangeLabels {
  [key: string]: ChangeLabels;
  all: UserVote[];
  values: object;
  default_value: number;
}

export interface Label {
  name: string;
  value: number;
  status: string;
}

export interface VoteRange {
  min: number;
  max: number;
}

export interface ChangeSubmitRequirement {
  name: string;
  status: string;
  is_legacy: boolean;
  submittability_expression_result: Record<string, object>;
}
