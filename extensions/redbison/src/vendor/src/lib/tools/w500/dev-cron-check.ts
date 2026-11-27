/**
 * Validating a five-field cron expression, with no cron library.
 *
 * Checks the shape and the ranges: `*`, `N`, `N-M`, `*​/N` and `N/M` within
 * each field's bounds. It does not work out when the job would next run,
 * which is what cron-parser is for and why the builder stays on the server.
 *
 * Day-of-week runs 0-7 because both 0 and 7 mean Sunday in the Vixie cron
 * most systems ship, and rejecting 7 would fail expressions that work.
 */
export const CRON_FIELDS: { label: string; min: number; max: number }[] = [
  { label: 'minute', min: 0, max: 59 },
  { label: 'hour', min: 0, max: 23 },
  { label: 'day-of-month', min: 1, max: 31 },
  { label: 'month', min: 1, max: 12 },
  { label: 'day-of-week', min: 0, max: 7 },
];

function validateField(field: string, min: number, max: number): string | null {
  for (const part of field.split(',')) {
    if (part === '*') continue;
    const stepMatch = part.match(/^(.*)\/(\d+)$/);
    const body = stepMatch ? stepMatch[1] : part;
    const step = stepMatch ? Number(stepMatch[2]) : null;
    if (step !== null && (step < 1 || step > max)) return `invalid step "${part}"`;
    if (body === '*' || body === '') continue;
    const rangeMatch = body.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]);
      const b = Number(rangeMatch[2]);
      if (a < min || b > max || a > b) return `range out of bounds "${part}"`;
      continue;
    }
    if (!/^\d+$/.test(body)) return `unrecognized "${part}"`;
    const n = Number(body);
    if (n < min || n > max) return `value ${n} out of range for field (${min}-${max})`;
  }
  return null;
}

/**
 * Two shapes of refusal, kept apart because they print differently and
 * always have: the wrong number of fields is one `error`, a set of bad
 * fields is a list of `errors`.
 */
export type CronCheck =
  | { valid: true; expression: string; summary: string; error?: undefined; errors?: undefined }
  | { valid: false; error: string; errors?: undefined }
  | { valid: false; error?: undefined; errors: string[] };

export function validateCron(expression: string): CronCheck {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return { valid: false, error: 'Expected 5 fields separated by whitespace.' };

  const errors: string[] = [];
  parts.forEach((p, i) => {
    const e = validateField(p, CRON_FIELDS[i].min, CRON_FIELDS[i].max);
    if (e) errors.push(`field ${i + 1}: ${e}`);
  });
  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    expression: parts.join(' '),
    summary: parts.map((p, i) => `${CRON_FIELDS[i].label}=${p}`).join(', '),
  };
}
