import { LocalStorage } from "@raycast/api";
import { searchArtifacts } from "../services/ai-search";
import { parseScanSettings, SETTINGS_KEY } from "../services/scan-settings";

type Input = {
  /** Contiguous text to match in the project name or full path. Omit to show all matching candidates. */
  query?: string;
  /** Explicit user-provided absolute or ~/ directory. Omit to use the saved scan root; never invent a root. */
  directory?: string;
  /** Comma-separated upstream or custom profile names, e.g. node,python,rust. Omit to use saved profiles, or node if unconfigured. */
  profiles?: string;
  /** Only estimates strictly larger than this many bytes. 1 GB = 1073741824 bytes. Unknown sizes are excluded. */
  minimumSizeBytes?: number;
  /** Only projects inactive for more than this number of days. Set only for an explicit numeric cutoff from the user; otherwise omit. Unknown activity is excluded. */
  minimumInactiveDays?: number;
  /** Set only when the user explicitly requests a risk label. Never map safe to review. Sensitive results require enabling them in Configure Scan first. */
  risk?: "all" | "review" | "sensitive" | "unknown";
  /** Result order. Unknown values sort last. Default largest. */
  sort?: "largest" | "smallest" | "oldest" | "newest" | "path";
  /** Maximum returned results, 1–100; default 30. Larger scans report truncation and matching totals. */
  limit?: number;
};

/** Run a fresh read-only npkill scan. Returns estimated sizes, project activity, risk, and explicit completeness metadata. Never deletes files. */
export default async function tool(input: Input) {
  return searchArtifacts(input, parseScanSettings(await LocalStorage.getItem<string>(SETTINGS_KEY)));
}
