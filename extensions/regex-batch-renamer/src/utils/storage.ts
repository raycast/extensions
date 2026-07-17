import { LocalStorage } from "@raycast/api";
import { RenameJob, JobExecution, RenameResult } from "../types";

const JOBS_KEY = "rename-jobs";
const HISTORY_KEY = "execution-history";
const MAX_HISTORY_ITEMS = 50;

export class JobStorage {
  static async getAllJobs(): Promise<RenameJob[]> {
    const jobsData = await LocalStorage.getItem<string>(JOBS_KEY);
    if (!jobsData) return [];

    try {
      const jobs = JSON.parse(jobsData);
      return jobs.map((job: RenameJob) => ({
        ...job,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt),
      }));
    } catch (error) {
      console.error("Failed to parse jobs data:", error);
      return [];
    }
  }

  static async saveJob(job: RenameJob): Promise<void> {
    const jobs = await this.getAllJobs();
    const existingIndex = jobs.findIndex((j) => j.id === job.id);

    if (existingIndex >= 0) {
      jobs[existingIndex] = { ...job, updatedAt: new Date() };
    } else {
      jobs.push(job);
    }

    await LocalStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  }

  static async deleteJob(jobId: string): Promise<void> {
    const jobs = await this.getAllJobs();
    const filteredJobs = jobs.filter((job) => job.id !== jobId);
    await LocalStorage.setItem(JOBS_KEY, JSON.stringify(filteredJobs));
  }

  static async getJob(jobId: string): Promise<RenameJob | null> {
    const jobs = await this.getAllJobs();
    return jobs.find((job) => job.id === jobId) || null;
  }

  static async duplicateJob(jobId: string): Promise<RenameJob | null> {
    const originalJob = await this.getJob(jobId);
    if (!originalJob) return null;

    const duplicatedJob: RenameJob = {
      ...originalJob,
      id: `${originalJob.id}-copy-${Date.now()}`,
      name: `${originalJob.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveJob(duplicatedJob);
    return duplicatedJob;
  }
}

export class ExecutionHistory {
  static async addExecution(execution: JobExecution): Promise<void> {
    const history = await this.getHistory();
    history.unshift(execution);

    // Keep only the most recent items
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
  }

  static async getHistory(): Promise<JobExecution[]> {
    const historyData = await LocalStorage.getItem<string>(HISTORY_KEY);
    if (!historyData) return [];

    try {
      const history = JSON.parse(historyData);
      return history.map((execution: JobExecution) => ({
        ...execution,
        executedAt: new Date(execution.executedAt),
        results: execution.results.map((result: RenameResult) => ({
          ...result,
        })),
      }));
    } catch (error) {
      console.error("Failed to parse execution history:", error);
      return [];
    }
  }

  static async clearHistory(): Promise<void> {
    await LocalStorage.removeItem(HISTORY_KEY);
  }
}
