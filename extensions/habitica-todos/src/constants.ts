/** Human-readable label for each Habitica priority value. */
export const PRIORITY_LABELS: Record<number, string> = {
  0.1: "Trivial",
  1: "Easy",
  1.5: "Medium",
  2: "Hard",
};

/** Dropdown options shared by the create-task and edit-task forms. */
export const PRIORITY_OPTIONS: { value: string; title: string }[] = [
  { value: "0.1", title: "Trivial" },
  { value: "1", title: "Easy" },
  { value: "1.5", title: "Medium" },
  { value: "2", title: "Hard" },
];

/** Sentinel value for the "no tag filter" dropdown option. */
export const TAG_FILTER_ALL = "all";

/** Shared S3 asset base URL used by avatar and inventory. */
export const ASSET_BASE_URL = "https://habitica-assets.s3.amazonaws.com/mobileApp/images/";
