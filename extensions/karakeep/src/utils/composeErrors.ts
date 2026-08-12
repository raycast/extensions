/**
 * Pure parsing of `docker compose` failure output.
 *
 * Separate from docker.ts so it carries no dependencies — that module reaches
 * for the logger, and therefore @raycast/api, which cannot load outside a
 * Raycast process and made these two functions untestable.
 */

export type ComposeFailure = "network" | "auth" | "disk" | "conflict" | "unknown";

/**
 * Substrings that identify each failure class, in priority order.
 *
 * A table rather than a chain of conditionals so adding a class is one line of
 * data — and so the whole vocabulary is readable at a glance.
 */
const SIGNATURES: [ComposeFailure, string[]][] = [
  [
    "network",
    [
      "no such host",
      "dial tcp",
      "i/o timeout",
      "connection refused",
      "temporary failure in name resolution",
      "network is unreachable",
      "tls handshake timeout",
    ],
  ],
  ["auth", ["unauthorized", "denied:", "authentication required"]],
  ["disk", ["no space left on device", "disk quota exceeded"]],
  ["conflict", ["port is already allocated", "address already in use"]],
];

/**
 * Classify a compose failure so the UI can lead with a cause rather than a
 * paragraph of daemon output.
 *
 * The distinction that matters most is `network`: it fails before anything is
 * pulled or recreated, so retrying later is the whole fix. Everything else may
 * have left work half-done.
 */
export function classifyComposeFailure(output: string): ComposeFailure {
  const text = output.toLowerCase();
  return SIGNATURES.find(([, needles]) => needles.some((needle) => text.includes(needle)))?.[0] ?? "unknown";
}

/**
 * The most informative single line of a compose failure.
 *
 * Compose interleaves per-image progress with the real error and then repeats
 * it as the daemon's final response, so the last substantive line is reliably
 * the cause — while "Interrupted" lines for the sibling images are not.
 */
export function summarizeComposeFailure(output: string): string {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/\bInterrupted\b/.test(line) && !/\bPulling\b$/.test(line));

  const daemon = lines.findLast((line) => line.startsWith("Error response from daemon"));
  return (daemon ?? lines.at(-1) ?? output.trim()).slice(0, 300);
}
