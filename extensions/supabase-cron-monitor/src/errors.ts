export const DEFAULT_SETUP_MESSAGE =
  "Cron monitoring views or functions are missing. Run the setup SQL in your Supabase project.";

export class MissingSetupError extends Error {
  constructor(message?: string) {
    super(message ?? DEFAULT_SETUP_MESSAGE);
    this.name = "MissingSetupError";
  }
}

export type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

export function isMissingSetupError(
  error: unknown,
): error is MissingSetupError {
  return error instanceof MissingSetupError;
}

export function isMissingSetupErrorLike(
  error: SupabaseErrorLike | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "42883") return true;

  const haystack =
    `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    haystack.includes("cron_job") ||
    haystack.includes("cron_job_run_details") ||
    haystack.includes("list_cron_jobs") ||
    haystack.includes("get_last_job_run") ||
    haystack.includes("get_cron_job_runs") ||
    (haystack.includes("cron.job") && haystack.includes("relation"))
  );
}

export function toErrorMessage(
  error: unknown,
  fallback = "Unknown error",
): string {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === "string") return error;

  const maybe = error as SupabaseErrorLike;
  const message = maybe?.message || maybe?.details || maybe?.hint;
  return message || fallback;
}
