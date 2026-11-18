/** Attach actionable context to operational failures without logging user clipboard data. */
export function createError(details: {
  status: number;
  message: string;
  why: string;
  fix: string;
}) {
  return Object.assign(new Error(details.message), details);
}
