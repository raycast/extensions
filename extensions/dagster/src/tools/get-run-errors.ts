import { dagsterRunUrl, fetchRunErrors } from "../api";
import { formatTimestamp } from "../helpers";

type Input = {
  /**
   * The run ID to fetch errors for. You can use a short prefix (8 chars) from get-runs output;
   * pass the full ID if available.
   */
  runId: string;
};

export default async function (input: Input) {
  const errors = await fetchRunErrors(input.runId);

  if (errors.length === 0) {
    return `No errors found for run ${input.runId}.`;
  }

  const sections = errors.map((e) => {
    const lines: string[] = [];
    const step = e.stepKey ? `Step: ${e.stepKey}` : "Run-level failure";
    lines.push(`${step} (${e.__typename})`);
    lines.push(`Time: ${formatTimestamp(e.timestamp, true)}`);
    if (e.error) {
      if (e.error.className) lines.push(`Error: ${e.error.className}`);
      lines.push(e.error.message);
      if (e.error.stack.length > 0) {
        lines.push("Stack trace (last 10 frames):");
        lines.push(...e.error.stack.slice(-10));
      }
    }
    return lines.join("\n");
  });

  return `${errors.length} error(s) for run ${input.runId} (${dagsterRunUrl(input.runId)}):\n\n${sections.join("\n---\n")}`;
}
