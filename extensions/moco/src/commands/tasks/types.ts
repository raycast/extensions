export type Task = {
  id: number;
  name: string;
  active?: boolean;
  projectID: number;
  projectName?: string;
  billable: boolean;
};
