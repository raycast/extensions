import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { getGhCommand } from "./preferences";
import { RateLimitResponseSchema } from "./types";
import { applyTemplate, buildSubstitutions } from "./useGHRateLimit";

const execFileAsync = promisify(execFile);

export default async function GHUsageStats() {
  try {
    const prefs = getPreferenceValues<Preferences.GhUsageStats>();
    const template = prefs.subtitleTemplate;
    const { stdout } = await execFileAsync(
      getGhCommand(),
      ["api", "rate_limit"],
      {
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
        },
      },
    );
    const data = RateLimitResponseSchema.parse(JSON.parse(stdout));
    updateCommandMetadata({
      subtitle: applyTemplate(template, buildSubstitutions(data.resources)),
    });
  } catch {
    updateCommandMetadata({ subtitle: "Failed to fetch" });
  }
}
