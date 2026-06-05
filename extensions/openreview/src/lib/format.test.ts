import { describe, it, expect } from "vitest";
import { reviewerShort, submissionMarkdown } from "./format";
import { Submission } from "../types";

const base: Submission = {
  id: "f1",
  number: 1042,
  cdate: 1738368000000,
  title: "Sparse Attention Routing",
  abstract: "We propose a Sparse Attention policy optimization method.",
  authors: ["Ada Lovelace", "Alan Turing"],
  venue: "ICML 2026 Conference Submission",
  venueShort: "ICML 2026",
  status: "Rejected",
  ratingLabel: "Rating",
  venueId: "ICML.cc/2026/Conference/Submission1042",
  forumUrl: "https://openreview.net/forum?id=f1",
  pdfUrl: null,
  reviews: [
    {
      id: "r1",
      reviewer: "Reviewer jkfT",
      rating: 4,
      confidence: 3,
      forumNoteUrl: "https://openreview.net/forum?id=f1&noteId=r1",
    },
    {
      id: "r2",
      reviewer: "Reviewer NHfd",
      rating: 5,
      confidence: 4,
      forumNoteUrl: "https://openreview.net/forum?id=f1&noteId=r2",
    },
  ],
  ratingAgg: { avg: 4.5, min: 4, max: 5, count: 2 },
  confidenceAgg: { avg: 3.5, min: 3, max: 4, count: 2 },
  decision: "Reject",
};

describe("reviewerShort", () => {
  it("strips the Reviewer prefix", () => {
    expect(reviewerShort("Reviewer jkfT")).toBe("jkfT");
    expect(reviewerShort("Reviewer")).toBe("Reviewer");
  });
});

describe("submissionMarkdown", () => {
  it("shows title, authors, and the abstract (reviewers live in the sidebar)", () => {
    const md = submissionMarkdown(base);
    expect(md).toContain("# Sparse Attention Routing");
    expect(md).toContain("_Ada Lovelace, Alan Turing_");
    expect(md).toContain(
      "We propose a Sparse Attention policy optimization method.",
    );
    expect(md).not.toContain("Read ↗");
    expect(md).not.toContain("jkfT");
  });

  it("falls back gracefully with no abstract and no reviews", () => {
    const md = submissionMarkdown({
      ...base,
      abstract: "",
      reviews: [],
      ratingAgg: null,
      confidenceAgg: null,
    });
    expect(md).toContain("# Sparse Attention Routing");
    expect(md).toContain("No abstract or reviews available yet");
  });
});
