import fetch from "node-fetch";

const SWIFT_EVOLUTION_PROPOSALS_ENDPOINT = "https://download.swift.org/swift-evolution/v1/evolution.json";

export type ProposalJson = {
  authors: { link: string; name: string }[];
  discussions: { link: string; name: string }[];
  id: string;
  link: string;
  reviewManagers: { link: string; name: string }[];
  sha: string;
  status: {
    end: string | undefined;
    start: string | undefined;
    state: string;
    version: string | undefined;
  };
  summary: string;
  title: string;
  trackingBugs: {
    asignee: string;
    id: string;
    link: string;
    status: string;
    title: string;
    updated: string;
  }[];
  implementation: {
    account: string;
    id: string;
    repository: string;
    type: string;
  }[];
};

export type EvolutionJson = {
  commit: string;
  creationDate: string;
  implementationVersions: string[];
  proposals: ProposalJson[];
};

export async function fetchProposals(): Promise<ProposalJson[]> {
  const response = await fetch(SWIFT_EVOLUTION_PROPOSALS_ENDPOINT);
  const evolution = (await response.json()) as EvolutionJson;
  return evolution.proposals;
}

export async function fetchMarkdown(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    return await response.text();
  } catch (error) {
    throw Promise.resolve(error);
  }
}

export {};
