interface DurationComponents {
  hours?: number;
  minutes?: number;
  seconds?: number;
}

export function validateDurationSeconds(seconds: number, now = Date.now()): number {
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error("Please enter a duration greater than zero using whole seconds within the supported range");
  }
  if (!Number.isFinite(new Date(now + seconds * 1000).getTime())) {
    throw new Error("The duration is too large to represent an end date");
  }
  return seconds;
}

export function calculateDuration(
  { hours = 0, minutes = 0, seconds = 0 }: DurationComponents,
  now = Date.now(),
): number {
  if (![hours, minutes, seconds].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error("Please ensure all arguments are non-negative whole numbers within the supported range");
  }
  return validateDurationSeconds(hours * 3600 + minutes * 60 + seconds, now);
}

/** Parse the separated timeout flag supported by Coffee's internal start API. */
export function parseCaffeinateTimeout(args: string[]): number | null {
  let duration: number | null = null;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith("-") || !arg.includes("t")) continue;
    if (arg !== "-t") throw new Error("Use a separate -t argument followed by whole seconds");
    if (duration !== null) throw new Error("Specify the caffeination timeout only once");
    const value = args[++index];
    if (value === undefined || !/^\d+$/.test(value)) {
      throw new Error("The caffeination timeout must be a positive whole number of seconds");
    }
    duration = validateDurationSeconds(Number(value));
  }
  return duration;
}
