import { describe, it, expect } from "vitest";
import {
  parseSubmissions,
  parseLeadingNumber,
  deriveVenueShort,
  deriveStatus,
  applyActivePhase,
} from "./parse";

const icmlNote = {
  id: "f1",
  forum: "f1",
  number: 1042,
  cdate: 1700000000000,
  tcdate: 1738368000000,
  content: {
    title: { value: "Sparse Attention Routing" },
    authors: { value: ["Ada Lovelace", "Alan Turing"] },
    venue: { value: "Submitted to ICML 2026" },
    venueid: { value: "ICML.cc/2026/Conference/Submission1042" },
    pdf: { value: "/pdf/abc.pdf" },
  },
  details: {
    directReplies: [
      {
        id: "r1",
        forum: "f1",
        invitations: [
          "ICML.cc/2026/Conference/Submission1042/-/Official_Review",
        ],
        signatures: ["ICML.cc/2026/Conference/Submission1042/Reviewer_jkfT"],
        content: {
          Overall_recommendation: { value: 4 },
          Confidence: { value: 3 },
        },
      },
      {
        id: "r2",
        forum: "f1",
        invitations: [
          "ICML.cc/2026/Conference/Submission1042/-/Official_Review",
        ],
        signatures: ["ICML.cc/2026/Conference/Submission1042/Reviewer_NHfd"],
        content: {
          Overall_recommendation: { value: 5 },
          Confidence: { value: 4 },
        },
      },
      {
        id: "r3",
        forum: "f1",
        invitations: [
          "ICML.cc/2026/Conference/Submission1042/-/Official_Review",
        ],
        signatures: ["ICML.cc/2026/Conference/Submission1042/Reviewer_U8Pq"],
        content: {
          Overall_recommendation: { value: 3 },
          Confidence: { value: 2 },
        },
      },
      {
        id: "d1",
        forum: "f1",
        invitations: ["ICML.cc/2026/Conference/Submission1042/-/Decision"],
        signatures: ["ICML.cc/2026/Conference/Program_Chairs"],
        content: { decision: { value: "Reject" } },
      },
    ],
  },
};

describe("parseLeadingNumber", () => {
  it("parses plain and prefixed", () => {
    expect(parseLeadingNumber(4)).toBe(4);
    expect(parseLeadingNumber("4: marginally above")).toBe(4);
    expect(parseLeadingNumber(undefined)).toBe(null);
  });
});

describe("deriveVenueShort", () => {
  it("trims boilerplate from real venue strings", () => {
    expect(deriveVenueShort("Submitted to ICML 2026", "")).toBe("ICML 2026");
    expect(deriveVenueShort("NeurIPS 2026 Conference Submission", "")).toBe(
      "NeurIPS 2026",
    );
    expect(
      deriveVenueShort("CVPR 2024 Conference Withdrawn Submission", ""),
    ).toBe("CVPR 2024");
    expect(deriveVenueShort("ACL ARR 2026 January Submission", "")).toBe(
      "ACL ARR 2026 January",
    );
    expect(deriveVenueShort("COLM 2026 Conference Submission", "")).toBe(
      "COLM 2026",
    );
  });
  it("falls back to venueId when venue is empty", () => {
    expect(deriveVenueShort("", "ICML.cc/2026/Conference/Submission1042")).toBe(
      "ICML 2026",
    );
  });
});

describe("deriveStatus", () => {
  it("derives status from venue, decision, and review count", () => {
    expect(
      deriveStatus("CVPR 2024 Conference Withdrawn Submission", null, 0),
    ).toBe("Withdrawn");
    expect(
      deriveStatus("ICML 2026 Conference Submission", "Accept (Poster)", 4),
    ).toBe("Accepted");
    expect(deriveStatus("Submitted to ICML 2026", "Reject", 4)).toBe(
      "Rejected",
    );
    expect(deriveStatus("ICML 2026 Desk Rejected Submission", null, 0)).toBe(
      "Desk Rejected",
    );
  });
  it("is Under Review with no reviews, Reviewed once reviews arrive", () => {
    expect(deriveStatus("NeurIPS 2026 Conference Submission", null, 0)).toBe(
      "Under Review",
    );
    expect(deriveStatus("ACL ARR 2026 January Submission", null, 3)).toBe(
      "Reviewed",
    );
  });
});

describe("applyActivePhase", () => {
  it("upgrades Reviewed to Under Review only when a task is open", () => {
    // COLM: reviewed + open rebuttal window -> actively under review.
    expect(applyActivePhase("Reviewed", true)).toBe("Under Review");
    // ACL: reviewed + cycle closed -> stays Reviewed.
    expect(applyActivePhase("Reviewed", false)).toBe("Reviewed");
    // Decisions and other states are never overridden.
    expect(applyActivePhase("Accepted", true)).toBe("Accepted");
    expect(applyActivePhase("Under Review", false)).toBe("Under Review");
  });
});

describe("parseSubmissions", () => {
  const [s] = parseSubmissions([icmlNote]);
  it("extracts summary", () => {
    expect(s.number).toBe(1042);
    expect(s.title).toMatch(/Sparse Attention/);
    expect(s.authors).toContain("Alan Turing");
    expect(s.venue).toBe("Submitted to ICML 2026");
    expect(s.pdfUrl).toContain("/pdf/abc.pdf");
    expect(s.forumUrl).toBe("https://openreview.net/forum?id=f1");
  });
  it("extracts reviews and aggregates", () => {
    expect(s.reviews).toHaveLength(3);
    expect(s.reviews[0].reviewer).toBe("Reviewer jkfT");
    expect(s.ratingAgg).toEqual({ avg: 4, min: 3, max: 5, count: 3 });
    expect(s.confidenceAgg).toEqual({ avg: 3, min: 2, max: 4, count: 3 });
  });
  it("extracts decision", () => {
    expect(s.decision).toBe("Reject");
  });
  it("derives venueShort and status", () => {
    expect(s.venueShort).toBe("ICML 2026");
    expect(s.status).toBe("Rejected");
  });
  it("captures the venue's own rating label", () => {
    expect(s.ratingLabel).toBe("Overall Recommendation");
  });
  it("prefers tcdate over cdate for chronological sort", () => {
    expect(s.cdate).toBe(1738368000000);
  });

  it("supports ICLR rating alias and missing fields", () => {
    const iclrNote = {
      id: "g1",
      forum: "g1",
      number: 1,
      content: { title: { value: "X" } },
      details: {
        directReplies: [
          {
            id: "x",
            forum: "g1",
            invitations: [
              "ICLR.cc/2026/Conference/Submission1/-/Official_Review",
            ],
            signatures: ["ICLR.cc/2026/Conference/Submission1/Reviewer_ab12"],
            content: { rating: { value: "8: accept" } },
          },
        ],
      },
    };
    const [z] = parseSubmissions([iclrNote]);
    expect(z.reviews[0].rating).toBe(8);
    expect(z.reviews[0].confidence).toBe(null);
    expect(z.confidenceAgg).toBe(null);
    expect(z.decision).toBe(null);
    expect(z.ratingLabel).toBe("Rating");
  });

  it("reads ACL ARR Overall Assessment and marks it Reviewed", () => {
    const aclNote = {
      id: "a1",
      forum: "a1",
      number: 2715,
      content: {
        title: { value: "Curriculum Distillation" },
        venue: { value: "ACL ARR 2026 January Submission" },
      },
      details: {
        directReplies: [
          {
            id: "ar1",
            forum: "a1",
            invitations: [
              "aclweb.org/ACL/ARR/2026/January/Submission2715/-/Official_Review",
            ],
            signatures: [
              "aclweb.org/ACL/ARR/2026/January/Submission2715/Reviewer_Cawh",
            ],
            content: {
              Overall_Assessment: { value: "3.5 = Borderline Conference" },
              Confidence: { value: 3 },
            },
          },
        ],
      },
    };
    const [a] = parseSubmissions([aclNote]);
    expect(a.reviews[0].rating).toBe(3.5);
    expect(a.ratingLabel).toBe("Overall Assessment");
    expect(a.status).toBe("Reviewed");
  });
});
