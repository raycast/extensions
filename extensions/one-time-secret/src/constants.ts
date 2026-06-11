export const TTL_OPTIONS: { value: number; title: string }[] = [
  { value: 60, title: "1 minute" },
  { value: 300, title: "5 minutes" },
  { value: 1800, title: "30 minutes" },
  { value: 3600, title: "1 hour" },
  { value: 14400, title: "4 hours" },
  { value: 43200, title: "12 hours" },
  { value: 86400, title: "1 day" },
  { value: 259200, title: "3 days" },
  { value: 604800, title: "7 days" },
  { value: 1209600, title: "14 days" },
  { value: 2592000, title: "30 days" },
];

export const DEFAULT_TTL_SECONDS = 3600;
export const MIN_PASSPHRASE_LENGTH = 8;
export const DEFAULT_REGION = "uk";
