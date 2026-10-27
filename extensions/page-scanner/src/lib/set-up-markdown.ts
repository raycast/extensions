/**
 * What Set Up Page Scanner shows (`set-up.tsx`): the two steps, each with its state, and the
 * instructions only for a step that is not done yet, so a finished page says it is finished
 * and fits the window without scrolling. No @raycast/api import, so it is tested.
 */
import type { HelperState } from "./helper-state";

export interface Progress {
  helper: HelperState;
  helperNode: string | null;
  browsers: string[];
  /** For `incomplete`: the browsers the helper is not set up in yet. */
  withoutHelper?: string[];
}

export const STORE_URL = "https://chromewebstore.google.com/detail/page-scanner/oinkohacnbkapdnnhpidmoidmidlgaoj";

export function setUpMarkdown(progress: Progress | undefined, error: string | undefined): string {
  if (error) return `# Set Up Page Scanner\n\nPage Scanner did not answer:\n\n\`\`\`\n${error}\n\`\`\``;
  if (!progress) return "# Set Up Page Scanner\n\nChecking what is set up already.";

  const helperDone = progress.helper === "ready";
  const connected = progress.browsers.length > 0;
  const helper =
    progress.helper === "broken"
      ? [
          `**Needs repair.** The Node it ran on is gone (\`${progress.helperNode ?? "unknown"}\`).`,
          "Press **Repair Helper** below to name the Node it runs on again.",
        ]
      : progress.helper === "outdated"
        ? [
            "**Needs repair.** It was set up before Page Scanner came to Edge Add-ons, so Edge cannot start it yet.",
            "Press **Repair Helper** below to set it up again for both stores.",
          ]
        : progress.helper === "incomplete"
          ? [
              `**Not in every browser.** ${(progress.withoutHelper ?? []).join(", ") || "A browser"} came after the helper was installed, so it cannot start the helper yet.`,
              "Press **Install Helper** below to set it up there too.",
            ]
          : helperDone
            ? ["**Done.**"]
            : [
                "**To do.**",
                "Press **Install Helper** below. It tells Chrome, Edge, Brave, Arc and Vivaldi where the helper is, and changes nothing else.",
              ];
  const connect = connected
    ? [`**Done.** Connected: ${progress.browsers.join(", ")}.`]
    : [
        "**To do.**",
        `Install [Page Scanner from the Chrome Web Store](${STORE_URL}) if you have not. Then open its settings (the gear in its popup), go to **Local Agents**, press **Connect** and allow what Chrome asks.`,
        "This page checks again every few seconds.",
      ];

  return [
    "# Set Up Page Scanner",
    "Raycast scans through the Page Scanner extension in your browser, which needs a small helper on this Mac to talk to it.",
    "## 1. Install the helper",
    ...helper,
    "## 2. Press Connect in the browser",
    ...connect,
    ...(connected && helperDone ? ["**All set.** Run **Scan Current Tab** from Raycast."] : []),
    ...(connected && progress.helper === "incomplete"
      ? [
          `**Ready in ${progress.browsers.join(", ")}.** Scan Current Tab works there now; install the helper to use the other browsers too.`,
        ]
      : []),
  ].join("\n\n");
}
