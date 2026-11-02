import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { logger } from "@chrismessina/raycast-logger";
import { LocalStorage, Tool } from "@raycast/api";
import { normalizeBody } from "../lib/body";
import { postCommit, prepareCommit } from "../lib/devnull";
import { writePreview } from "../lib/images";
import { rememberUsername } from "../username";

type Input = {
  /**
   * The text of the commit, exactly as it will appear on /dev/null, in the user's voice. Use only what the user
   * said: no added claims, benefits, adjectives, links, hashtags or emoji. Never mention or link an image here.
   * Plain text; `inline code` and ``` fenced code blocks render. At most 4,000 characters; a link counts as at most 23.
   */
  text: string;
  /**
   * Absolute file paths of up to 3 images to attach, such as a screenshot the user attached or named.
   * JPEG, PNG or WebP only, at most 10 MB and 6,000 pixels on a side each. Leave empty for a text-only commit.
   * If the user wants an image posted but you don't know its absolute path, do not call this tool: ask for the path.
   */
  imagePaths?: string[];
};

function commitOf(input: Input) {
  // Models often send "" for an optional field; a blank path is no path.
  return { message: input.text, imagePaths: (input.imagePaths ?? []).filter((path) => path.trim() !== "") };
}

// The images' hashes as the user saw them in the confirmation, so the tool can refuse to post a file that
// changed in the meantime. Raycast runs the confirmation and the tool in separate processes, so they go
// through LocalStorage. Each distinct commit gets its own record, which expires after ten minutes.
const APPROVAL_TTL_MS = 10 * 60 * 1000;
const approvalKey = (input: Input) =>
  `approval:${createHash("sha256")
    .update(JSON.stringify(commitOf(input)))
    .digest("hex")}`;

// The hashes in a stored approval, or undefined if it is missing, unreadable or expired.
function liveHashes(stored: string | undefined): string[] | undefined {
  try {
    const approval = JSON.parse(stored ?? "") as { at: number; hashes: string[] };
    return Date.now() - approval.at < APPROVAL_TTL_MS ? approval.hashes : undefined;
  } catch {
    return undefined;
  }
}

async function takeApproval(input: Input): Promise<string[] | undefined> {
  const key = approvalKey(input);
  const stored = await LocalStorage.getItem<string>(key);
  await LocalStorage.removeItem(key);
  return liveHashes(stored);
}

// Canceled confirmations never reach the tool, so their records are removed here once they expire.
// Each record is read again before it is removed, so one that another confirmation refreshed since
// allItems() is kept.
async function pruneApprovals() {
  const items = await LocalStorage.allItems<Record<string, string>>();
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith("approval:") || liveHashes(value)) continue;
    if (!liveHashes(await LocalStorage.getItem<string>(key))) await LocalStorage.removeItem(key);
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Refuse before asking: there is no point confirming a commit /dev/null would reject.
  const { message, images } = await prepareCommit(commitOf(input));
  await pruneApprovals();
  await LocalStorage.setItem(
    approvalKey(input),
    JSON.stringify({ at: Date.now(), hashes: images.map((image) => image.sha256) }),
  );
  return {
    message: "Post this commit to /dev/null? It will be public.",
    info: [
      // As /dev/null will save it, so what the user approves is what appears.
      { name: "Commit", value: normalizeBody(message) },
      {
        name: images.length === 1 ? "Image" : "Images",
        // Shown even when empty, so a commit that promises a screenshot without one is easy to catch.
        value: images.length > 0 ? images.map((image) => image.name).join(", ") : "None",
      },
    ],
    // A copy of the hashed bytes, so the preview is the image that will be posted even if the file changes.
    image: images[0] ? pathToFileURL(await writePreview(images[0])).href : undefined,
  };
};

/**
 * Post a commit (a public post) to /dev/null, the social network for developers, signed with the user's
 * SSH key. Optionally attach up to 3 images by absolute file path. Returns the link to the new commit and
 * whether it is waiting for review. Only say images were posted when imagesAttached is more than 0.
 * Show the url to the user in full.
 */
export default async function tool(input: Input) {
  const commit = commitOf(input);
  // null rather than undefined: there should have been an approval, so a missing one is logged as such.
  const approvedImageHashes = (await takeApproval(input)) ?? null;
  const result = await postCommit(commit, { log: (message, data) => logger.log(message, data), approvedImageHashes });
  await rememberUsername(result.url);
  return {
    url: result.url,
    pendingReview: result.pending,
    imagesAttached: commit.imagePaths.length,
  };
}
