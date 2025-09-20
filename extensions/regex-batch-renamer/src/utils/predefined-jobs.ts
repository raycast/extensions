import { RenameJob, RegexRule } from "../types";

// Slugify rules for web-friendly filenames
const slugifyRules: RegexRule[] = [
  {
    id: "to-lowercase",
    find: "([A-Z])",
    replace: "$1",
    flags: "g",
    description: "Convert to lowercase (handled in post-processing)",
  },
  {
    id: "spaces-to-hyphens",
    find: "[\\s_/\\\\]+",
    replace: "-",
    flags: "g",
    description: "Replace spaces and separators with hyphens",
  },
  {
    id: "remove-special-chars",
    find: "[^a-zA-Z0-9\\-\\.]",
    replace: "",
    flags: "g",
    description: "Remove special characters except hyphens and dots",
  },
  {
    id: "collapse-hyphens",
    find: "-+",
    replace: "-",
    flags: "g",
    description: "Replace multiple consecutive hyphens with single hyphen",
  },
  {
    id: "trim-hyphens",
    find: "^-+|-+$",
    replace: "",
    flags: "g",
    description: "Remove leading and trailing hyphens",
  },
];

// Clean filename rules
const cleanFilenameRules: RegexRule[] = [
  {
    id: "remove-version-numbers",
    find: "\\s*v?\\d+\\.\\d+(\\.\\d+)?\\s*",
    replace: " ",
    flags: "gi",
    description: "Remove version numbers (v1.0, 2.1.3, etc.)",
  },
  {
    id: "remove-copy-suffix",
    find: "\\s*\\(copy(\\s+\\d+)?\\)\\s*",
    replace: "",
    flags: "gi",
    description: "Remove (copy) and (copy 1) suffixes",
  },
  {
    id: "remove-download-suffix",
    find: "\\s*\\(\\d+\\)\\s*(?=\\.[^.]*$)",
    replace: "",
    flags: "g",
    description: "Remove download numbers like (1), (2) before extension",
  },
  {
    id: "clean-underscores",
    find: "_+",
    replace: " ",
    flags: "g",
    description: "Replace underscores with spaces",
  },
  {
    id: "normalize-spaces",
    find: "\\s+",
    replace: " ",
    flags: "g",
    description: "Normalize multiple spaces to single space",
  },
  {
    id: "trim-spaces",
    find: "^\\s+|\\s+$",
    replace: "",
    flags: "g",
    description: "Trim leading and trailing spaces",
  },
];

export const PREDEFINED_JOBS: RenameJob[] = [
  {
    id: "slugify-filenames",
    name: "Slugify Filenames",
    description: "Convert filenames to URL-friendly slugs with hyphens and lowercase",
    rules: slugifyRules,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "clean-filenames",
    name: "Clean Filenames",
    description: "Remove version numbers, copy suffixes, and normalize spacing",
    rules: cleanFilenameRules,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
];

export async function initializePredefinedJobs(): Promise<void> {
  const { JobStorage } = await import("./storage");
  const existingJobs = await JobStorage.getAllJobs();

  for (const predefinedJob of PREDEFINED_JOBS) {
    const exists = existingJobs.some((job) => job.id === predefinedJob.id);
    if (!exists) {
      await JobStorage.saveJob(predefinedJob);
    }
  }
}
