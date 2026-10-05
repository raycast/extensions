export const formatRuns = (count?: number) => {
  if (!count) return undefined;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M runs`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K runs`;
  return `${count} runs`;
};

export const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : undefined);

export const formatDuration = (seconds?: number) => (seconds ? `${seconds.toFixed(1)}s` : undefined);

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

export const formatAgo = (time: number) => {
  const seconds = (time - Date.now()) / 1000;
  const [unit, size] = UNITS.find(([, length]) => Math.abs(seconds) >= length) ?? ["second", 1];
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(seconds / size), unit);
};
