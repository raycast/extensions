export type CLIOutput = {
  activeWorkflows: WorkflowItem[];
  globalWorkflows: WorkflowItem[];
  activeAppID: string;
};

export type WorkflowItem = {
  fullTitle: string;
  workflowID: string;
  isGlobal: boolean;
};
