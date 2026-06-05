import { Submission, Review, Aggregate } from "../types";

// Dummy submissions for capturing Store screenshots without touching real data.
// Only served in development when the "demo-mode" flag is set (see openreview.ts).
// Everything here is entirely fictional — invented titles, numbers, and authors.

function agg(nums: number[]): Aggregate | null {
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return {
    avg: sum / nums.length,
    min: Math.min(...nums),
    max: Math.max(...nums),
    count: nums.length,
  };
}

function rev(
  id: string,
  who: string,
  rating: number | null,
  confidence: number | null,
): Review {
  return {
    id,
    reviewer: `Reviewer ${who}`,
    rating,
    confidence,
    forumNoteUrl: `https://openreview.net/forum?id=demo&noteId=${id}`,
  };
}

function make(
  s: Pick<
    Submission,
    | "number"
    | "cdate"
    | "title"
    | "abstract"
    | "venue"
    | "venueShort"
    | "status"
    | "ratingLabel"
    | "decision"
  > & { reviews: Review[] },
): Submission {
  return {
    id: `demo-${s.number}`,
    number: s.number,
    cdate: s.cdate,
    title: s.title,
    abstract: s.abstract,
    authors: ["Ada Lovelace", "Alan Turing", "Grace Hopper", "Claude Shannon"],
    venue: s.venue,
    venueShort: s.venueShort,
    status: s.status,
    ratingLabel: s.ratingLabel,
    venueId: "",
    forumUrl: "https://openreview.net/forum?id=demo",
    pdfUrl: "https://openreview.net/pdf?id=demo",
    reviews: s.reviews,
    ratingAgg: agg(
      s.reviews.map((r) => r.rating).filter((n): n is number => n !== null),
    ),
    confidenceAgg: agg(
      s.reviews.map((r) => r.confidence).filter((n): n is number => n !== null),
    ),
    decision: s.decision,
  };
}

export const DEMO_SUBMISSIONS: Submission[] = [
  make({
    number: 1042,
    cdate: 1748736000000,
    title: "Sparse Attention Routing for Long-Context Transformers",
    abstract:
      "We introduce a learned sparse attention router that selects which key blocks each query attends to, cutting attention FLOPs on long-context workloads while matching dense-attention quality.",
    venue: "NeurIPS 2026 Conference Submission",
    venueShort: "NeurIPS 2026",
    status: "Under Review",
    ratingLabel: "Rating",
    decision: null,
    reviews: [
      rev("d1", "x4Qa", 7, 4),
      rev("d2", "Mt9b", 6, 3),
      rev("d3", "Kp2L", 7, 4),
    ],
  }),
  make({
    number: 388,
    cdate: 1743552000000,
    title: "Curriculum Distillation for Low-Resource Machine Translation",
    abstract:
      "A curriculum that orders distillation targets by estimated difficulty, improving low-resource translation quality without additional parallel data.",
    venue: "COLM 2026 Conference Submission",
    venueShort: "COLM 2026",
    status: "Under Review",
    ratingLabel: "Rating",
    decision: null,
    reviews: [
      rev("c1", "WWTa", 5, 4),
      rev("c2", "TiFS", 5, 3),
      rev("c3", "4HRa", 7, 4),
    ],
  }),
  make({
    number: 2715,
    cdate: 1740960000000,
    title: "Bandit-Based Prompt Optimization without Gradients",
    abstract:
      "We frame prompt search as a contextual bandit problem and optimize prompts with no gradient access, achieving competitive results under tight query budgets.",
    venue: "ACL ARR 2026 January Submission",
    venueShort: "ACL ARR 2026 January",
    status: "Reviewed",
    ratingLabel: "Overall Assessment",
    decision: null,
    reviews: [
      rev("a1", "Cawh", 3.5, 3),
      rev("a2", "Gckn", 3, 3),
      rev("a3", "AHRx", 4, 5),
    ],
  }),
  make({
    number: 4530,
    cdate: 1738368000000,
    title: "Contrastive Pretraining for Tabular Anomaly Detection",
    abstract:
      "A contrastive pretraining objective for heterogeneous tabular data that yields representations transferring well to downstream anomaly-detection tasks.",
    venue: "ICLR 2026 Conference Submission",
    venueShort: "ICLR 2026",
    status: "Accepted",
    ratingLabel: "Rating",
    decision: "Accept (Poster)",
    reviews: [
      rev("i1", "Zt3p", 8, 4),
      rev("i2", "Lq7m", 6, 5),
      rev("i3", "Rk1d", 6, 3),
    ],
  }),
  make({
    number: 6189,
    cdate: 1735689600000,
    title: "Memory-Efficient Optimizers for Billion-Parameter Models",
    abstract:
      "A family of optimizer-state compression schemes that reduce memory footprint during large-model training with negligible impact on convergence.",
    venue: "Submitted to ICML 2026",
    venueShort: "ICML 2026",
    status: "Rejected",
    ratingLabel: "Overall Recommendation",
    decision: "Reject",
    reviews: [
      rev("m1", "jkfT", 4, 3),
      rev("m2", "NHfd", 5, 4),
      rev("m3", "U8Pq", 3, 2),
      rev("m4", "sKfN", 4, 3),
    ],
  }),
  make({
    number: 903,
    cdate: 1733011200000,
    title: "Depth-Aware Diffusion for Indoor Scene Synthesis",
    abstract:
      "A diffusion model conditioned on monocular depth that synthesizes coherent indoor scenes with consistent geometry across viewpoints.",
    venue: "CVPR 2025 Conference Withdrawn Submission",
    venueShort: "CVPR 2025",
    status: "Withdrawn",
    ratingLabel: "Rating",
    decision: null,
    reviews: [],
  }),
];
