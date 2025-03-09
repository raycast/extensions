declare module "node-crontab" {
  /**
   * Schedule a cron job
   * @param cronTime The cron expression
   * @param command The command to execute
   * @param args Arguments to pass to the command
   * @param options Options for the cron job
   * @returns The job ID or null if scheduling failed
   */
  export function scheduleJob(
    cronTime: string,
    command: string,
    args?: Array<string>,
    options?: { comment?: string }
  ): number | null;

  /**
   * Remove a scheduled job
   * @param jobId The ID of the job to remove
   * @returns True if the job was removed, false otherwise
   */
  export function removeJob(jobId: number): boolean;
}
