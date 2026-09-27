import { getPreferenceValues } from "@raycast/api";
import { TypeSafeClient, choice } from "@typesafe-ai/sdk";
import { SITE_TABLE } from "./candidates";

let cachedClient: TypeSafeClient | null = null;

function getClient(): TypeSafeClient {
  if (!cachedClient) {
    const { apiKey } = getPreferenceValues<Preferences>();
    cachedClient = new TypeSafeClient({ apiKey });
  }
  return cachedClient;
}

export type ActionKind =
  "open_download" | "open_app" | "open_file" | "open_url" | "unsupported";
export type FileType = "pdf" | "image" | "document" | "archive" | "any";
export type DownloadRank =
  "newest" | "second_newest" | "third_newest" | "oldest";

export const NONE = "none";
export const OTHER = "other";

export interface InterpretResult {
  action: ActionKind;
  actionConfidence: number;
  fileType: FileType;
  downloadRank: DownloadRank; // which matching download: latest, nth-latest, or first-ever
  appName: string; // an installed app's name, or NONE
  fileCandidate: string; // a candidate's label, or NONE
  siteName: string; // a SITE_TABLE key, or OTHER
}

/**
 * Phase 1: classify the request from the query plus the installed app list —
 * apps are needed up front so "open cursor" is recognized as an installed app
 * rather than a brand. No file names leave the device at this stage.
 */
export async function classifyAction(
  query: string,
  appNames: string[],
): Promise<ActionKind> {
  const client = getClient();
  const response = await client.systemOne({
    state: { request: query, installedApps: appNames },
    questions: {
      action: choice(
        "What kind of thing is this request asking for? If a name in the request matches (or " +
          "clearly refers to) an entry in `installedApps`, this is open_app even if the name isn't a " +
          "generically famous product. A recognizable company/product/brand name with no matching " +
          "installed app is still probably open_url (most brands are best known as websites) rather " +
          "than unsupported.",
        {
          open_download:
            "Open a downloaded file, optionally of a specific type (pdf, image, document, archive) — whether the latest or an earlier one.",
          open_app:
            "Launch or switch to an application listed in `installedApps`.",
          open_file:
            "Find and open a specific existing file by name or description — not necessarily a download.",
          open_url: "Open a website.",
          unsupported:
            "Anything else: not about opening/launching something, or too vague to act on at all " +
            "(e.g. asking a question, requesting a count, or general chat).",
        },
      ),
    },
  });
  return response.answers.action.choice as ActionKind;
}

/**
 * Phase 2: follow-up questions, scoped to what the classified action needs.
 * Local file names only leave the device when the request is actually about
 * opening a file; download ranking needs no candidate list at all; sites are
 * a static curated table (nothing private). App names are re-sent only for
 * open_app so Jev can pick the exact entry.
 */
export async function answerFollowups(
  query: string,
  action: ActionKind,
  appNames: string[],
  fileCandidateLabels: string[],
): Promise<InterpretResult> {
  const client = getClient();

  const questions: Record<string, ReturnType<typeof choice>> = {};

  const state: Record<string, string | string[]> = { request: query };

  if (action === "open_download") {
    questions.fileType = choice(
      "What type of downloaded file does the request want?",
      {
        pdf: "PDF documents",
        image: "Photos or images",
        document: "Word processing, text, or spreadsheet documents",
        archive: "Zip or other archive files",
        any: "No specific type mentioned",
      },
    );
    questions.downloadRank = choice(
      'Which download does the request want? "newest" is the most recent matching download; ' +
        '"oldest" is the very first one they ever downloaded (words like "first", "oldest", ' +
        '"earliest", "original"); the nth options cover "second most recent"/"third most ' +
        "recent\" phrasing. Default to newest when the request doesn't say.",
      {
        newest:
          'The most recently downloaded matching file ("last", "latest", "recent", or unspecified).',
        second_newest: "The second most recently downloaded matching file.",
        third_newest: "The third most recently downloaded matching file.",
        oldest:
          'The oldest/first-ever matching download ("first", "oldest", "earliest", "original").',
      },
    );
  } else if (action === "open_app") {
    const appCriteria: Record<string, string | null> = {
      [NONE]:
        "No application is being requested, or none of the listed apps match.",
    };
    for (const name of appNames) appCriteria[name] = null;
    state.installedApps = appNames;
    questions.appName = choice(
      "Which entry in `installedApps` does the request mean?",
      appCriteria,
    );
  } else if (action === "open_file") {
    const fileCriteria: Record<string, string | null> = {
      [NONE]:
        "No specific existing file is being requested, or none of the listed files match.",
    };
    for (const label of fileCandidateLabels) fileCriteria[label] = null;
    state.candidateFiles = fileCandidateLabels;
    questions.fileCandidate = choice(
      "Which entry in `candidateFiles` (if any) does the request mean — matching by meaning, " +
        'not just literal substring (e.g. "cv" can match a file named "resume" or "Resume_2026.pdf")?',
      fileCriteria,
    );
  } else if (action === "open_url") {
    const siteCriteria: Record<string, string | null> = {
      [OTHER]: "No listed site matches.",
    };
    for (const name of Object.keys(SITE_TABLE)) siteCriteria[name] = null;
    state.knownSites = Object.keys(SITE_TABLE);
    questions.siteName = choice(
      "If the request doesn't already contain an explicit URL, which entry in `knownSites` (if any) does it mean?",
      siteCriteria,
    );
  }

  const answers: Record<string, { choice: string }> =
    Object.keys(questions).length > 0
      ? ((await client.systemOne({ state, questions })).answers as Record<
          string,
          { choice: string }
        >)
      : {};

  return {
    action,
    actionConfidence: 0,
    fileType: (answers.fileType?.choice as FileType | undefined) ?? "any",
    downloadRank:
      (answers.downloadRank?.choice as DownloadRank | undefined) ?? "newest",
    appName: answers.appName?.choice ?? NONE,
    fileCandidate: answers.fileCandidate?.choice ?? NONE,
    siteName: answers.siteName?.choice ?? OTHER,
  };
}
