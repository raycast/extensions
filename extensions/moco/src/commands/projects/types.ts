import { Task } from "../tasks/types";
import { Customer } from "../customers/types";
import { StatusType } from "../utils/storage";

export type Project = {
  id: number;
  identifier?: string;
  name: string;
  active?: boolean;
  billable?: boolean;
  customer?: Customer;
  tasks: Task[];
  status?: StatusType;
};
