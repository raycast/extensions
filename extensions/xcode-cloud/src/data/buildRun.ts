import { CiCompletionStatus, CiExecutionProgress } from "../appstore-connect";

export class BuildRun {
  id: string;
  number: number;
  title: string;
  reason: string;
  progress: CiExecutionProgress;
  status: CiCompletionStatus;
  workflow: string;

  constructor(
    id: string,
    number: number,
    title: string,
    reason: string,
    progress: CiExecutionProgress,
    status: CiCompletionStatus,
    workflow: string
  ) {
    this.id = id;
    this.number = number;
    this.title = title;
    this.reason = reason;
    this.progress = progress;
    this.status = status;
    this.workflow = workflow;
  }
}
