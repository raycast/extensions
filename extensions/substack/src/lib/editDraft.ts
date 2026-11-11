import { type AccountConnection } from "./accounts";
import { type DraftReference } from "./createDraft";
import { rememberDraft } from "./recovery";
import { createSubstackClient, publicationOrigin } from "./substackClient";

export type EditableDraft = DraftReference & {
  title: string;
  subtitle: string;
  body: string;
  updatedAt: string | null;
  bylines: { id: number; is_guest?: boolean }[];
  sectionId: number | null;
};
export class DraftEditError extends Error {
  constructor(public draft: DraftReference) {
    super("The draft exists, but its changes could not be verified. Open it in Substack before saving again.");
  }
}
function draftAuthors(raw: Record<string, unknown>): EditableDraft["bylines"] {
  // Substack exposes write-ready bylines, draft profiles, or published profiles.
  for (const key of ["draft_bylines", "draftBylines", "publishedBylines"]) {
    const authors = raw[key];
    if (authors == null) continue;
    if (
      !Array.isArray(authors) ||
      authors.some(
        (author) =>
          !author ||
          !Number.isSafeInteger(author.id) ||
          author.id <= 0 ||
          (author.is_guest !== undefined && typeof author.is_guest !== "boolean"),
      )
    )
      throw new Error("Substack returned invalid draft authors.");
    if (!authors.length) continue;
    if (key === "draft_bylines") return authors;
    return authors.map((author) => ({
      id: author.id,
      is_guest: key === "draftBylines" ? (author.is_guest ?? false) : false,
    }));
  }
  return [];
}
export async function loadDraft(account: AccountConnection, id: number): Promise<EditableDraft> {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid draft ID.");
  const { origin, request } = createSubstackClient(account);
  const raw = await request<Record<string, unknown>>(`drafts/${id}`);
  if (!raw || raw.id !== id || raw.type !== "newsletter" || raw.is_published !== false)
    throw new Error("Only unpublished newsletter drafts can be edited here.");
  const field = (key: string) => {
    if (raw[key] == null) return "";
    if (typeof raw[key] !== "string") throw new Error("Substack returned an invalid draft.");
    return raw[key] as string;
  };
  const body = field("draft_body") || JSON.stringify({ type: "doc", content: [] });
  try {
    if (JSON.parse(body).type !== "doc") throw new Error();
  } catch {
    throw new Error("Substack returned an invalid draft body.");
  }
  const bylines = draftAuthors(raw);
  const sectionId = raw.draft_section_id ?? raw.section_id ?? null;
  if (sectionId !== null && (!Number.isSafeInteger(sectionId) || Number(sectionId) <= 0))
    throw new Error("Substack returned an invalid publication section.");
  return {
    id,
    editorUrl: `${origin}/publish/post/${id}`,
    title: field("draft_title"),
    subtitle: field("draft_subtitle"),
    body,
    updatedAt: field("draft_updated_at") || null,
    bylines,
    sectionId: sectionId as number | null,
  };
}
export async function saveDraft(
  account: AccountConnection,
  original: EditableDraft,
  changes: { title: string; subtitle: string; body: string },
): Promise<void> {
  const title = changes.title.trim();
  const subtitle = changes.subtitle.trim();
  if (!title) throw new Error("Enter a title.");
  if (original.editorUrl !== `${publicationOrigin(account.publication)}/publish/post/${original.id}`)
    throw new Error("The draft's connection changed. Open it in Substack.");
  const current = await loadDraft(account, original.id);
  if (
    ["title", "subtitle", "body", "updatedAt"].some(
      (key) => current[key as keyof EditableDraft] !== original[key as keyof EditableDraft],
    )
  )
    throw new Error("This draft changed in Substack. Reload it before saving.");
  await rememberDraft(account.id, title, original, false);
  const { request } = createSubstackClient(account);
  try {
    await request(`drafts/${original.id}`, "PUT", {
      draft_title: title,
      draft_subtitle: subtitle,
      draft_body: changes.body,
      draft_bylines: current.bylines,
      draft_section_id: current.sectionId,
      section_chosen: !!current.sectionId,
      detect_language: true,
    });
    const saved = await loadDraft(account, original.id);
    if (saved.title !== title || saved.subtitle !== subtitle || saved.body !== changes.body) throw new Error();
    await rememberDraft(account.id, title, original, true);
  } catch {
    throw new DraftEditError(original);
  }
}
