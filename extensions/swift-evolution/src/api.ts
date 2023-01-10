import fetch from "node-fetch";

const SWIFT_EVOLUTION_PROPOSALS_ENDPOINT = "https://download.swift.org/swift-evolution/proposals.json";

export enum Status {
  awaitingReview = ".awaitingReview",
  scheduledForReview = ".scheduledForReview",
  activeReview = ".activeReview",
  accepted = ".accepted",
  acceptedWithRevisions = ".acceptedWithRevisions",
  previewing = ".previewing",
  implemented = ".implemented",
  returnedForRevision = ".returnedForRevision",
  deferred = ".deferred",
  rejected = ".rejected",
  withdrawn = ".withdrawn",
}

export type ProposalJson = {
  id: string;
  title: string;
  summary: string;
  status: {
    end: string | undefined;
    start: string | undefined;
    state: Status;
    version: string | undefined;
  };
  sha: string;
  reviewManager: { link: string; name: string };
  link: string;
  implementation:
    | {
        account: string;
        id: string;
        repository: string;
        type: string;
      }[]
    | null;
  authors: { link: string; name: string }[];
};

export async function fetchProposals(): Promise<ProposalJson[]> {
  const response = await fetch(SWIFT_EVOLUTION_PROPOSALS_ENDPOINT);
  return (await response.json()) as ProposalJson[];
}

export {};
