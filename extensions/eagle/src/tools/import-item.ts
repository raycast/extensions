import { environment, Tool } from "@raycast/api";
import { importItem, prepareImport } from "../utils/ai-import";

type Input = {
  /** Exact active library ID returned by get-library. Never guess or reuse it after a library switch. */
  libraryId: string;
  /** One readable local regular file. Use an absolute path or ~/; preserve spaces. Supply this OR assetUrl. The source is never deleted. */
  path?: string;
  /** One public HTTP(S) direct asset URL. HTML webpages, private hosts and authenticated URLs are unsupported. Supply this OR path. */
  assetUrl?: string;
  /** Optional item name, without path separators. */
  name?: string;
  /** Optional source webpage URL to record as metadata, separate from the direct asset URL. */
  sourceUrl?: string;
  /** Optional notes supplied or approved by the user. */
  notes?: string;
  /** Optional explicitly supplied tags. The tool applies these values without generating classifications. */
  tags?: string[];
  /** Existing destination folder IDs resolved through get-library. Do not create folders. */
  folderIds?: string[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { library, folders, source, attempt, name } = await prepareImport(input, {}, environment.supportPath);
  const metadata = attempt
    ? attempt.expected
    : { url: input.sourceUrl ?? input.assetUrl, annotation: input.notes, tags: input.tags };
  return {
    message: attempt
      ? "Reconcile this earlier Eagle import? No new import or metadata update will be sent."
      : "Import this asset into Eagle?",
    info: [
      { name: "Library", value: `${library.name}\n${library.path}` },
      { name: "Asset", value: input.assetUrl || source.path },
      { name: "Folders", value: folders.map((folder) => folder.path).join("\n") || "Unfiled" },
      { name: "Name", value: name },
      { name: "Earlier Attempt", value: attempt?.itemId },
      { name: "Source URL", value: metadata.url },
      { name: "Notes", value: metadata.annotation },
      { name: "Tags", value: metadata.tags?.join(", ") },
    ],
  };
};

/** Import one asset after checking duplicates. A pending or uncertain result is not success; repeat identical input to reconcile without another POST. */
export default async function tool(input: Input) {
  return importItem(input, environment.supportPath);
}
