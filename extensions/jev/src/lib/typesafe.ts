import { getPreferenceValues } from "@raycast/api";
import { TypeSafeClient, choice } from "@typesafe-ai/sdk";

interface Preferences {
  apiKey: string;
}

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
 * One TypeSafe request, several parallel/speculative Choice questions.
 * Code resolves which sub-answer actually applies once it knows `action`;
 * asking them all together avoids a second round-trip for the common case.
 *
 * All questions see the same `state`, which includes the real candidate
 * lists (not just the raw query) — this lets `action` itself recognize e.g.
 * "cursor" as an installed app, or "facebook" as neither an installed app
 * nor a known site, instead of judging the sentence in isolation.
 */
export async function interpret(
  query: string,
  appNames: string[],
  fileCandidateLabels: string[],
  siteNames: string[],
): Promise<InterpretResult> {
  const client = getClient();

  const appCriteria: Record<string, string | null> = {
    [NONE]:
      "No application is being requested, or none of the listed apps match.",
  };
  for (const name of appNames.slice(0, 250)) appCriteria[name] = null;

  const fileCriteria: Record<string, string | null> = {
    [NONE]:
      "No specific existing file is being requested, or none of the listed files match.",
  };
  for (const label of fileCandidateLabels) fileCriteria[label] = null;

  const siteCriteria: Record<string, string | null> = {
    [OTHER]:
      "No listed site matches, or the request isn't about opening a site.",
  };
  for (const name of siteNames) siteCriteria[name] = null;

  const response = await client.systemOne({
    state: {
      request: query,
      installedApps: appNames,
      recentFiles: fileCandidateLabels,
      knownSites: siteNames,
    },
    questions: {
      action: choice(
        "What kind of thing is this request asking for? Cross-check the request against " +
          "`installedApps`, `recentFiles`, and `knownSites`: if a name in the request matches (or " +
          "clearly refers to) an entry in `installedApps`, this is open_app even if the name isn't a " +
          "generically famous product; likewise for `recentFiles` and `knownSites`. A recognizable " +
          "company/product/brand name with no matching installed app and no matching known site is " +
          "still probably open_url (most brands are best known as websites) rather than unsupported.",
        {
          open_download:
            "Open a downloaded file, optionally of a specific type (pdf, image, document, archive) — whether the latest or an earlier one.",
          open_app:
            "Launch or switch to an application listed in `installedApps`.",
          open_file:
            "Find and open a specific existing file by name or description — not necessarily a download.",
          open_url:
            "Open a website, whether or not it's listed in `knownSites`.",
          unsupported:
            "Anything else: not about opening/launching something, or too vague to act on at all " +
            "(e.g. asking a question, requesting a count, or general chat).",
        },
      ),
      fileType: choice(
        "If the request is about opening a recent download, what type of file do they want? Ignore if not applicable.",
        {
          pdf: "PDF documents",
          image: "Photos or images",
          document: "Word processing, text, or spreadsheet documents",
          archive: "Zip or other archive files",
          any: "No specific type mentioned, or not applicable",
        },
      ),
      downloadRank: choice(
        'If the request is about opening a download, which one? "newest" is the most recent ' +
          'matching download; "oldest" is the very first one they ever downloaded (words like ' +
          '"first", "oldest", "earliest", "original"); the nth options cover "second most ' +
          'recent"/"third most recent" phrasing. Default to newest when the request doesn\'t say.',
        {
          newest:
            'The most recently downloaded matching file ("last", "latest", "recent", or unspecified).',
          second_newest: "The second most recently downloaded matching file.",
          third_newest: "The third most recently downloaded matching file.",
          oldest:
            'The oldest/first-ever matching download ("first", "oldest", "earliest", "original").',
        },
      ),
      appName: choice(
        "If the request is about launching or switching to an application, which entry in `installedApps` does it mean? Ignore if not applicable.",
        appCriteria,
      ),
      fileCandidate: choice(
        'If the request names or describes a specific existing file to find and open, which entry in `recentFiles` (if any) does it mean — matching by meaning, not just literal substring (e.g. "cv" can match a file named "resume" or "Resume_2026.pdf")? Ignore if not applicable.',
        fileCriteria,
      ),
      siteName: choice(
        "If the request is about opening a website and doesn't already contain an explicit URL, which entry in `knownSites` (if any) does it mean? Ignore if not applicable.",
        siteCriteria,
      ),
    },
  });

  return {
    action: response.answers.action.choice as ActionKind,
    actionConfidence: response.answers.action.confidence,
    fileType: response.answers.fileType.choice as FileType,
    downloadRank: response.answers.downloadRank.choice as DownloadRank,
    appName: response.answers.appName.choice,
    fileCandidate: response.answers.fileCandidate.choice,
    siteName: response.answers.siteName.choice,
  };
}
