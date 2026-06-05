export interface Review {
  id: string; // review note id (for new-review tracking)
  reviewer: string; // "Reviewer jkfT"
  rating: number | null; // Overall_recommendation / rating
  confidence: number | null;
  forumNoteUrl: string; // link to the review note
}

export interface Aggregate {
  avg: number;
  min: number;
  max: number;
  count: number;
}

export type SubmissionStatus =
  | "Under Review"
  | "Reviewed"
  | "Accepted"
  | "Rejected"
  | "Withdrawn"
  | "Desk Rejected";

export interface Submission {
  id: string; // forum/note id
  number: number; // 1042
  cdate: number; // creation/submission time (ms epoch), for chronological sort
  title: string;
  abstract: string;
  authors: string[];
  venue: string; // raw, e.g. "ICML 2026 Conference Submission"
  venueShort: string; // trimmed, e.g. "ICML 2026"
  status: SubmissionStatus;
  ratingLabel: string; // venue's own rating field name, e.g. "Rating" / "Overall Recommendation"
  venueId: string;
  forumUrl: string;
  pdfUrl: string | null;
  reviews: Review[];
  ratingAgg: Aggregate | null;
  confidenceAgg: Aggregate | null;
  decision: string | null; // "Reject" | "Accept ..." | null
}
