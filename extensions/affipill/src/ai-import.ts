import { AI } from "@raycast/api";
import { basename } from "path";
import { applyAiSuggestions, coverRefsFromPaths, parseAiImportResponse, type CoverRef } from "./ai-import-result";
import type { ImportDraft } from "./folder-import";

const BATCH_SIZE = 40;

type AiImportPayload = {
  tracks: Array<{
    id: string;
    file: string;
    title: string;
    subtitle: string;
    coverId: string | null;
    coverFile: string | null;
  }>;
  covers: Array<{
    id: string;
    file: string;
  }>;
};

export async function improveImportWithAi(drafts: ImportDraft[], coverPaths: string[]): Promise<ImportDraft[]> {
  if (drafts.length === 0) {
    return drafts;
  }

  const covers = coverRefsFromPaths(coverPaths);
  const suggestions = await askForSuggestions(drafts, covers);
  return applyAiSuggestions(drafts, covers, suggestions);
}

async function askForSuggestions(drafts: ImportDraft[], covers: CoverRef[]) {
  const validIds = new Set(drafts.map((draft) => draft.id));
  const validCoverIds = new Set(covers.map((cover) => cover.id));
  const suggestions = [];

  for (const batch of chunk(drafts, BATCH_SIZE)) {
    const prompt = buildPrompt(batch, covers);
    const response = await AI.ask(prompt, { creativity: "low" });
    suggestions.push(...parseAiImportResponse(response, validIds, validCoverIds));
  }

  return suggestions;
}

function buildPrompt(drafts: ImportDraft[], covers: CoverRef[]): string {
  const payload: AiImportPayload = {
    tracks: drafts.map((draft) => ({
      id: draft.id,
      file: basename(draft.audioPath),
      title: draft.title,
      subtitle: draft.subtitle,
      coverId: coverIdForPath(covers, draft.coverPath),
      coverFile: draft.coverPath ? basename(draft.coverPath) : null,
    })),
    covers: covers.map((cover) => ({ id: cover.id, file: cover.file })),
  };

  return [
    "You are preparing affirmation audio tracks for a local library.",
    "Improve the title and subtitle for every track, and match each track to a cover image when one clearly belongs to it.",
    "",
    "Rules:",
    "- Return JSON only. No markdown, no commentary.",
    "- Include every track id exactly once.",
    "- Titles should be short, human-readable affirmation names in title case.",
    "- Remove track numbers and junk words such as final, master, mix, version, v2, audio, cover, artwork, affipill.",
    '- Prefer first-person affirmation titles when the filename suggests one, e.g. "I Am Worthy".',
    "- Subtitle is a short description of the track. Reuse the title when nothing else is known.",
    "- coverId must be one of the provided cover ids, or null if no cover clearly matches.",
    "- Do not invent files or ids. A cover may be reused when several tracks share artwork.",
    "- Keep an existing cover when it already looks correct.",
    "",
    "Return this shape:",
    '{"tracks":[{"id":"track-id","title":"I Am Worthy","subtitle":"Morning confidence affirmation","coverId":"c0"}]}',
    "",
    "Input:",
    JSON.stringify(payload),
  ].join("\n");
}

function coverIdForPath(covers: CoverRef[], path?: string): string | null {
  if (!path) {
    return null;
  }

  return covers.find((cover) => cover.path === path)?.id ?? null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}
