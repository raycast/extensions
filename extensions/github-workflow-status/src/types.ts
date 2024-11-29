export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  repository: string;
  created_at: string;
  html_url: string;
  workflow_id: number;
}
