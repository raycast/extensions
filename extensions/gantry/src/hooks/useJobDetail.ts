import { useCachedPromise } from "@raycast/utils";
import { getPrintInfo } from "../lib/data/print-parser";
import { readLogTail } from "../lib/data/log-reader";
import { summarizeLogs } from "../lib/llm/summarize-log";
import { getCachedSummary, setCachedSummary } from "../lib/llm/summary-cache";
import { getConfig, isLLMConfigured } from "../helpers/preferences";
import type { LaunchJob, PrintInfo } from "../lib/types";

interface JobDetailData {
  printInfo: PrintInfo | null;
  logContent: string | null;
  summary: string | null;
}

export function useJobDetail(job: LaunchJob | null) {
  const { data, isLoading, revalidate } = useCachedPromise(
    async (j: LaunchJob): Promise<JobDetailData> => {
      const [printInfo, logContent] = await Promise.all([
        getPrintInfo(j.label),
        getLogContent(j),
      ]);

      let summary: string | null = null;
      if (logContent && isLLMConfigured()) {
        const cached = await getCachedSummary(j.label, logContent);
        if (cached) {
          summary = cached;
        } else {
          const config = getConfig();
          summary = await summarizeLogs(config, logContent, j.label);
          if (summary) {
            await setCachedSummary(j.label, logContent, summary);
          }
        }
      }

      return { printInfo, logContent, summary };
    },
    [job!],
    {
      execute: job !== null,
      keepPreviousData: true,
    },
  );

  return {
    printInfo: data?.printInfo ?? null,
    logContent: data?.logContent ?? null,
    summary: data?.summary ?? null,
    isLoading,
    revalidate,
  };
}

async function getLogContent(job: LaunchJob): Promise<string | null> {
  const logPath = job.logPaths.stdout ?? job.logPaths.stderr;
  if (!logPath) return null;
  return readLogTail(logPath, 50);
}
