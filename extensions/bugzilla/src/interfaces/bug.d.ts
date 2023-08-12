export interface Bug {
  id: string;
  url: string;
  summary: string;
  description: string[];
  comments?: Comment[];
  creator: string;
  creation_time: string;
  assigned_to: string;
  product: string;
  version: string[];
  component: strng[];
  last_change_time: string;
  status: string;
  is_open: boolean;
  priority: string;
  severity: string;
  last_change_date_locale: Date; // Custom value populated by extension
  creation_date_locale: Date; // Custom value populated by extension
  bug_url: string; // Custom value populated by extension
}
