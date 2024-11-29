export interface WorkflowRun {
  id: number;
  name: string | null;
  status: string | undefined;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  repository?: string;
}
