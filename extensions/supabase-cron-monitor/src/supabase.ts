import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  MissingSetupError,
  SupabaseErrorLike,
  isMissingSetupErrorLike,
  toErrorMessage,
} from "./errors";
import { CronJob, FetchMode, JobRunDetail } from "./types";

export function createSupabaseClient(preferences: Preferences): SupabaseClient {
  return createClient(preferences.supabaseUrl, preferences.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "X-Client-Info": "raycast-supabase-cron-monitor",
      },
    },
  });
}

export async function fetchCronJobs(
  client: SupabaseClient,
): Promise<{ jobs: CronJob[]; mode: FetchMode }> {
  const { data, error } = await client
    .from("cron_job")
    .select("*")
    .order("jobname", { ascending: true });
  if (!error && data) {
    return { jobs: data as CronJob[], mode: "view" };
  }

  if (isMissingSetupErrorLike(error as SupabaseErrorLike | null)) {
    const fallback = await client.rpc("list_cron_jobs");
    if (!fallback.error && fallback.data) {
      return { jobs: fallback.data as CronJob[], mode: "rpc" };
    }

    throw new MissingSetupError(
      toErrorMessage(fallback.error, toErrorMessage(error)),
    );
  }

  throw new Error(toErrorMessage(error));
}

export async function fetchLastRun(
  client: SupabaseClient,
  jobName: string,
  mode: FetchMode,
): Promise<JobRunDetail | null> {
  if (mode === "rpc") {
    return fetchLastRunViaRpc(client, jobName);
  }

  const { data, error } = await client
    .from("cron_job_run_details")
    .select("*")
    .eq("jobname", jobName)
    .order("start_time", { ascending: false })
    .limit(1);

  if (!error) {
    return (data as JobRunDetail[] | null)?.[0] ?? null;
  }

  if (isMissingSetupErrorLike(error as SupabaseErrorLike | null)) {
    return fetchLastRunViaRpc(client, jobName);
  }

  throw new Error(toErrorMessage(error));
}

export async function fetchJobRuns(
  client: SupabaseClient,
  jobName: string,
  limit: number,
  mode: FetchMode,
): Promise<JobRunDetail[]> {
  if (mode === "rpc") {
    return fetchJobRunsViaRpc(client, jobName, limit);
  }

  const { data, error } = await client
    .from("cron_job_run_details")
    .select("*")
    .eq("jobname", jobName)
    .order("start_time", { ascending: false })
    .limit(limit);

  if (!error && data) {
    return data as JobRunDetail[];
  }

  if (isMissingSetupErrorLike(error as SupabaseErrorLike | null)) {
    return fetchJobRunsViaRpc(client, jobName, limit);
  }

  throw new Error(toErrorMessage(error));
}

export async function fetchRecentRuns(
  client: SupabaseClient,
  limit: number,
  mode: FetchMode,
): Promise<JobRunDetail[]> {
  if (mode === "rpc") {
    return fetchRecentRunsViaRpc(client, limit);
  }

  const { data, error } = await client
    .from("cron_job_run_details")
    .select("*")
    .order("start_time", { ascending: false })
    .limit(limit);

  if (!error && data) {
    return data as JobRunDetail[];
  }

  if (isMissingSetupErrorLike(error as SupabaseErrorLike | null)) {
    return fetchRecentRunsViaRpc(client, limit);
  }

  throw new Error(toErrorMessage(error));
}

export function getSqlEditorUrl(supabaseUrl: string): string | null {
  try {
    const url = new URL(supabaseUrl);
    const match = url.hostname.match(/^([^.]+)\.supabase\.co$/);
    if (!match) return null;
    return `https://supabase.com/dashboard/project/${match[1]}/sql/new`;
  } catch {
    return null;
  }
}

export function getDashboardUrl(supabaseUrl: string): string | null {
  try {
    const url = new URL(supabaseUrl);
    const match = url.hostname.match(/^([^.]+)\.supabase\.co$/);
    if (!match) return null;
    return `https://supabase.com/dashboard/project/${match[1]}`;
  } catch {
    return null;
  }
}

async function fetchLastRunViaRpc(
  client: SupabaseClient,
  jobName: string,
): Promise<JobRunDetail | null> {
  const { data, error } = await client.rpc("get_last_job_run", {
    p_jobname: jobName,
  });
  if (!error && data) {
    return (data as JobRunDetail[] | null)?.[0] ?? null;
  }

  if (isMissingSetupErrorLike(error as SupabaseErrorLike | null)) {
    throw new MissingSetupError(toErrorMessage(error));
  }

  throw new Error(toErrorMessage(error));
}

async function fetchJobRunsViaRpc(
  client: SupabaseClient,
  jobName: string,
  limit: number,
): Promise<JobRunDetail[]> {
  const { data, error } = await client.rpc("get_cron_job_runs", {
    p_jobname: jobName,
    p_limit: limit,
  });
  if (!error && data) {
    return data as JobRunDetail[];
  }

  if (isMissingSetupErrorLike(error as SupabaseErrorLike | null)) {
    throw new MissingSetupError(toErrorMessage(error));
  }

  throw new Error(toErrorMessage(error));
}

async function fetchRecentRunsViaRpc(
  client: SupabaseClient,
  limit: number,
): Promise<JobRunDetail[]> {
  const { data, error } = await client.rpc("get_cron_job_runs", {
    p_jobname: null,
    p_limit: limit,
  });
  if (!error && data) {
    return data as JobRunDetail[];
  }

  if (isMissingSetupErrorLike(error as SupabaseErrorLike | null)) {
    throw new MissingSetupError(toErrorMessage(error));
  }

  throw new Error(toErrorMessage(error));
}
