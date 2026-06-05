import { Submission, Review, Aggregate, SubmissionStatus } from "../types";

const RATING_KEYS = [
  "overall_recommendation",
  "overall_assessment", // ACL ARR
  "rating",
  "recommendation",
  "score",
];
const CONFIDENCE_KEYS = ["confidence"];
const REVIEW_RE = /Official_Review/;
const DECISION_RE = /Decision/;
const META_RE = /Meta_Review/;

// Boilerplate words that mark where the human-readable venue name ends.
const VENUE_CUT =
  /\b(Conference|Submission|Withdrawn|Desk|Camera|Workshop|Track)\b/;

// "Submitted to ICML 2026" -> "ICML 2026"
// "NeurIPS 2026 Conference Submission" -> "NeurIPS 2026"
// "CVPR 2024 Conference Withdrawn Submission" -> "CVPR 2024"
// "ACL ARR 2026 January Submission" -> "ACL ARR 2026 January"
export function deriveVenueShort(venue: string, venueId: string): string {
  let v = (venue || "").replace(/^submitted to\s+/i, "").trim();
  const cut = v.search(VENUE_CUT);
  if (cut > 0) v = v.slice(0, cut).trim();
  if (v) return v;
  // Fallback: derive from venueId like "ICML.cc/2026/Conference/Submission1042".
  const parts = (venueId || "").split("/");
  const group = (parts[0] || "").replace(/\.(cc|org|net)$/i, "");
  const year = parts.find((p) => /^\d{4}$/.test(p));
  return [group, year].filter(Boolean).join(" ").trim();
}

export function deriveStatus(
  venue: string,
  decision: string | null,
  reviewCount: number,
): SubmissionStatus {
  const v = venue || "";
  if (/withdrawn/i.test(v)) return "Withdrawn";
  if (
    /desk[\s-]?reject/i.test(v) ||
    (decision && /desk[\s-]?reject/i.test(decision))
  )
    return "Desk Rejected";
  if (decision) {
    if (/accept/i.test(decision)) return "Accepted";
    if (/reject/i.test(decision)) return "Rejected";
  }
  // Reviews are in but no decision yet (e.g. ACL ARR, post-review window).
  // Distinguish from a freshly-submitted paper that is genuinely under review.
  if (reviewCount > 0) return "Reviewed";
  return "Under Review";
}

// A reviewed paper with an open author task (a future-dated invitation, e.g. an
// active rebuttal window) is genuinely still under review — unlike a venue whose
// review cycle has closed (all invitations expired), which stays "Reviewed".
export function applyActivePhase(
  base: SubmissionStatus,
  hasOpenTask: boolean,
): SubmissionStatus {
  if (hasOpenTask && base === "Reviewed") return "Under Review";
  return base;
}

export function parseLeadingNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const m = v.match(/-?\d+(\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return null;
}

function val(
  content: Record<string, unknown> | undefined,
  key: string,
): unknown {
  const f = content?.[key];
  return f && typeof f === "object" && "value" in (f as object)
    ? (f as { value: unknown }).value
    : f;
}

// Match the first key whose value is numeric, returning the ORIGINAL key name
// (so the venue's own label, e.g. "Rating" vs "Overall_recommendation", is kept).
function matchField(
  content: Record<string, unknown> | undefined,
  keys: string[],
): { key: string; value: number } | null {
  if (!content) return null;
  const lower: Record<string, string> = {};
  for (const k of Object.keys(content)) lower[k.toLowerCase()] = k;
  for (const want of keys) {
    if (lower[want]) {
      const n = parseLeadingNumber(val(content, lower[want]));
      if (n !== null) return { key: lower[want], value: n };
    }
  }
  return null;
}

// "Overall_recommendation" -> "Overall Recommendation", "rating" -> "Rating"
export function prettifyLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function invsOf(note: Record<string, unknown>): string[] {
  if (Array.isArray(note.invitations)) return note.invitations as string[];
  if (typeof note.invitation === "string") return [note.invitation];
  return [];
}

function reviewerLabel(note: Record<string, unknown>): string {
  const sig = ((note.signatures as string[]) ?? [])[0] ?? "";
  const m = sig.match(/Reviewer_([A-Za-z0-9]+)/);
  return m ? `Reviewer ${m[1]}` : "Reviewer";
}

function aggregate(nums: number[]): Aggregate | null {
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return {
    avg: sum / nums.length,
    min: Math.min(...nums),
    max: Math.max(...nums),
    count: nums.length,
  };
}

type RawNote = Record<string, unknown> & {
  content?: Record<string, unknown>;
  details?: { directReplies?: Record<string, unknown>[] };
};

export function parseSubmissions(notes: RawNote[]): Submission[] {
  return notes.map((note) => {
    const c = note.content ?? {};
    const replies = note.details?.directReplies ?? [];

    const reviewNotes = replies.filter((r) =>
      invsOf(r).some((i) => REVIEW_RE.test(i)),
    );
    let ratingKey: string | null = null;
    const reviews: Review[] = reviewNotes.map((r) => {
      const rc = r.content as Record<string, unknown>;
      const rm = matchField(rc, RATING_KEYS);
      const cm = matchField(rc, CONFIDENCE_KEYS);
      if (rm && !ratingKey) ratingKey = rm.key;
      // Link format: forum?id=<paper forum>&noteId=<review note id>.
      // Use the reply's own forum (identical to the paper's, but robust).
      const forumId = (r.forum as string) ?? note.forum;
      return {
        id: String(r.id),
        reviewer: reviewerLabel(r),
        rating: rm?.value ?? null,
        confidence: cm?.value ?? null,
        forumNoteUrl: `https://openreview.net/forum?id=${forumId}&noteId=${r.id}`,
      };
    });

    const decisionNote =
      replies.find((r) => invsOf(r).some((i) => DECISION_RE.test(i))) ??
      replies.find((r) => invsOf(r).some((i) => META_RE.test(i)));
    let decision: string | null = null;
    if (decisionNote) {
      const dContent = decisionNote.content as Record<string, unknown>;
      const d = val(dContent, "decision") ?? val(dContent, "recommendation");
      decision = typeof d === "string" ? d : d != null ? String(d) : null;
    }

    const pdf = val(c, "pdf");
    const venue = String(val(c, "venue") ?? "");
    const venueId = String(val(c, "venueid") ?? "");
    return {
      id: String(note.id),
      number: (note.number as number) ?? 0,
      // Prefer tcdate (true creation = real submission time). cdate alone is
      // unreliable: venues often overwrite it to a uniform deadline, which
      // causes ties and a scrambled chronological order.
      cdate: (note.tcdate as number) ?? (note.cdate as number) ?? 0,
      title: String(val(c, "title") ?? "(untitled)"),
      abstract: String(val(c, "abstract") ?? ""),
      authors: (val(c, "authors") as string[]) ?? [],
      venue,
      venueShort: deriveVenueShort(venue, venueId),
      status: deriveStatus(venue, decision, reviews.length),
      ratingLabel: ratingKey ? prettifyLabel(ratingKey) : "Rating",
      venueId,
      forumUrl: `https://openreview.net/forum?id=${note.forum}`,
      pdfUrl: typeof pdf === "string" ? `https://openreview.net${pdf}` : null,
      reviews,
      ratingAgg: aggregate(
        reviews.map((r) => r.rating).filter((n): n is number => n !== null),
      ),
      confidenceAgg: aggregate(
        reviews.map((r) => r.confidence).filter((n): n is number => n !== null),
      ),
      decision,
    };
  });
}
