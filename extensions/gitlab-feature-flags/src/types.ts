export type Flag = {
  name: string;
  default_enabled: boolean;
  group: string | null;
  milestone: string | null;
  introduced_by_url: string | null;
  rollout_issue_url: string | null;
  type: string | null;
  web_url: string;
};
