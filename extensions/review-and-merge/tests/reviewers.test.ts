import { describe, expect, it } from "vitest";
import {
  buildReviewers,
  ReviewNode,
  ReviewRequestNode,
} from "../src/lib/reviewers";

const userRequest = (login: string): ReviewRequestNode => ({
  requestedReviewer: {
    __typename: "User",
    login,
    avatarUrl: `https://avatars/${login}.png`,
  },
});

const teamRequest = (name: string): ReviewRequestNode => ({
  requestedReviewer: { __typename: "Team", name },
});

const review = (login: string, state: string): ReviewNode => ({
  author: { login, avatarUrl: `https://avatars/${login}.png` },
  state,
});

describe("buildReviewers", () => {
  it("marks requested reviewers as pending", () => {
    const reviewers = buildReviewers([userRequest("alice")], []);
    expect(reviewers).toEqual([
      {
        type: "user",
        login: "alice",
        avatarUrl: "https://avatars/alice.png",
        status: "pending",
      },
    ]);
  });

  it("maps a requested team to a pending team reviewer without an avatar", () => {
    const reviewers = buildReviewers([teamRequest("platform")], []);
    expect(reviewers).toEqual([
      { type: "team", login: "platform", avatarUrl: "", status: "pending" },
    ]);
  });

  it("maps submitted reviews to their status", () => {
    const reviewers = buildReviewers(
      [],
      [
        review("bob", "APPROVED"),
        review("carol", "CHANGES_REQUESTED"),
        review("dan", "COMMENTED"),
      ],
    );
    expect(reviewers.map((r) => [r.login, r.status])).toEqual([
      ["bob", "approved"],
      ["carol", "changes_requested"],
      ["dan", "commented"],
    ]);
  });

  it("keeps a re-requested reviewer pending and ignores their stale review", () => {
    const reviewers = buildReviewers(
      [userRequest("alice")],
      [review("alice", "APPROVED")],
    );
    expect(reviewers).toEqual([
      {
        type: "user",
        login: "alice",
        avatarUrl: "https://avatars/alice.png",
        status: "pending",
      },
    ]);
  });

  it("drops reviews in other states and null actors", () => {
    const reviewers = buildReviewers(
      [{ requestedReviewer: null }],
      [
        review("eve", "DISMISSED"),
        review("frank", "PENDING"),
        { author: null, state: "APPROVED" },
      ],
    );
    expect(reviewers).toEqual([]);
  });
});
