import fetch from "node-fetch";
import { ProposalJson, fetchProposals as fetchRemoteProposals, Status } from "./api";
import { ProposalViewModel } from "./ProposalsList";

type DisplayableStatus = { display: string };

const displayableStatusMap: Record<Status, DisplayableStatus> = {
  ".awaitingReview": { display: "Awaiting Review" },
  ".scheduledForReview": { display: "Scheduled For Review" },
  ".activeReview": { display: "In Review" },
  ".accepted": { display: "Accepted" },
  ".acceptedWithRevisions": { display: "Accepted" },
  ".previewing": { display: "Previewing" },
  ".implemented": { display: "Implemented" },
  ".returnedForRevision": { display: "Returned" },
  ".deferred": { display: "Deferred" },
  ".rejected": { display: "Rejected" },
  ".withdrawn": { display: "Withdrawn" },
};

function convertToViewModel(proposals: ProposalJson[]): ProposalViewModel[] {
  const proposalsViewModel: ProposalViewModel[] = proposals
    .map((x) => {
      return {
        id: x.id,
        authorName: x.authors.map((x) => x.name).join(","),
        reviewManagerName: x.reviewManager.name,
        link: "https://github.com/apple/swift-evolution/blob/main/proposals/" + x.link,
        markdownLink: "https://raw.githubusercontent.com/apple/swift-evolution/main/proposals/" + x.link,
        keywords: getKeywords(x),
        repos: getRepos(x),
        status: getDisplayableStatus(x).display,
        // statusColor: "red",
        title: x.title.trim(),
        swiftVersion: x.status.version,
      };
    })
    .reverse();
  return proposalsViewModel;
}

function getDisplayableStatus(proposal: ProposalJson): DisplayableStatus {
  const jsonStatus = proposal.status.state;
  let display = displayableStatusMap[jsonStatus];
  if (display === undefined) {
    display = {
      display: jsonStatus,
    };
  }
  return display;
}

function getRepos(proposal: ProposalJson): string | undefined {
  const repos = (proposal.implementation ?? []).map((x) => x.repository);
  return repos
    .reduce((repos, repo) => {
      if (repo === undefined) return repos;
      if (repos.includes(repo)) return repos;
      repos.push(repo);
      return repos;
    }, [] as string[])
    .join("|");
}

function getKeywords(proposal: ProposalJson) {
  const statusKeywords = getDisplayableStatus(proposal).display.split(" ");
  const summaryKeywords = proposal.summary.trim().split(" ");
  const titleKeywords = proposal.title.trim().split(" ");
  const repoKeywords = getRepos(proposal)?.split("|");
  const version = proposal.status.version?.trim();
  return [proposal.id, proposal.status.version, statusKeywords, summaryKeywords, titleKeywords, repoKeywords, version]
    .flat()
    .filter((x) => x !== undefined) as string[];
}

export async function fetchProposals(): Promise<ProposalViewModel[]> {
  try {
    const json = await fetchRemoteProposals();
    return convertToViewModel(json);
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }
}

export async function fetchMarkdown(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    return await response.text();
  } catch (error) {
    throw Promise.resolve(error);
  }
}
