import { getUploadStatus } from "../api";

type Input = {
  /**
   * The request_id returned when a post was published immediately.
   */
  requestId?: string;
  /**
   * The job_id returned when a post was scheduled or queued.
   */
  jobId?: string;
};

export default async function tool(input: Input) {
  return getUploadStatus(input);
}
