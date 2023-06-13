import fetch from "node-fetch";
import { ProposalJson, fetchProposals as fetchRemoteProposals } from "./api";
import { ProposalViewModel } from "./ProposalsList";

enum Status {
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

const statusToViewModelMap = new Map<string, Pick<ProposalViewModel, "status" | "statusColor">>([
  [Status.awaitingReview, { status: "Awaiting Review", statusColor: "orange" }],
  [Status.scheduledForReview, { status: "Scheduled For Review", statusColor: "orange" }],
  [Status.activeReview, { status: "In Review", statusColor: "orange" }],
  [Status.accepted, { status: "Accepted", statusColor: "green" }],
  [Status.acceptedWithRevisions, { status: "Accepted", statusColor: "green" }],
  [Status.previewing, { status: "Previewing", statusColor: "green" }],
  [Status.implemented, { status: "Implemented", statusColor: "blue" }],
  [Status.returnedForRevision, { status: "Returned", statusColor: "purple" }],
  [Status.deferred, { status: "Deferred", statusColor: "red" }],
  [Status.rejected, { status: "Rejected", statusColor: "red" }],
  [Status.withdrawn, { status: "Withdrawn", statusColor: "red" }],
]);

function convertToViewModel(proposals: ProposalJson[]): ProposalViewModel[] {
  const proposalsViewModel: ProposalViewModel[] = proposals
    .map((json) => {
      const viewModel: ProposalViewModel = {
        id: json.id,
        authors: json.authors.map((x) => ({ ...x, name: x.name.trim() })),
        implementations: getImplementations(json),
        reviewManagerName: json.reviewManager.name.trim(),
        reviewManagerProfileLink: json.reviewManager.link,
        link: "https://github.com/apple/swift-evolution/blob/main/proposals/" + json.link,
        markdownLink: "https://raw.githubusercontent.com/apple/swift-evolution/main/proposals/" + json.link,
        keywords: getKeywords(json),
        status: statusToViewModelMap.get(json.status.state)?.status ?? json.status.state,
        statusColor: statusToViewModelMap.get(json.status.state)?.statusColor ?? "blue",
        title: json.title.trim(),
        swiftVersion: json.status.version,
        scheduled:
          json.status.start !== undefined && json.status.end !== undefined
            ? convertStartEndToScheduled(json.status.start, json.status.end)
            : undefined,
        isNew: isNew(json),
      };
      return viewModel;
    })
    .reverse();
  return proposalsViewModel;
}

function getKeywords(proposal: ProposalJson) {
  const statusKeywords = statusToViewModelMap.get(proposal.status.state)?.status;
  const summaryKeywords = proposal.summary.trim().split(" ");
  const titleKeywords = proposal.title.trim().split(" ");
  const repoKeywords = getRepos(proposal);
  const version = proposal.status.version?.trim();
  return [
    proposal.id,
    proposal.status.version,
    statusKeywords,
    summaryKeywords,
    titleKeywords,
    repoKeywords,
    version,
    proposal.id,
  ]
    .flat()
    .filter((x) => x !== undefined) as string[];
}

function getRepos(proposal: ProposalJson): string[] {
  const repos = (proposal.implementation ?? []).map((x) => x.repository);
  return repos.reduce((repos, repo) => {
    if (repo === undefined) return repos;
    if (repos.includes(repo)) return repos;
    repos.push(repo);
    return repos;
  }, [] as string[]);
}

function getImplementations(proposal: ProposalJson): { title: string; url: string }[] {
  const implementations = proposal.implementation ?? [];
  return implementations.map((x) => {
    return {
      title: `${x.repository}#${x.id}`,
      url: `https://github.com/apple/swift/pull/${x.id}`,
    };
  });
}

function isNew(proposal: ProposalJson): boolean {
  if (proposal.status.start === undefined) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const start = new Date(proposal.status.start);
  console.log(start.valueOf() - sevenDaysAgo.valueOf());
  return start > sevenDaysAgo && start < new Date();
}

function convertStartEndToScheduled(startDate: string, endDate: string): string {
  const month: { [x: number]: string } = {
    0: "January",
    1: "February",
    2: "March",
    3: "April",
    4: "May",
    5: "June",
    6: "July",
    7: "August",
    8: "September",
    9: "October",
    10: "November",
    11: "December",
  };
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start.getMonth() === end.getMonth()) {
    return `${month[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`;
  }
  return `${month[start.getMonth()]} ${start.getDate()} - ${month[end.getMonth()]} ${end.getDate()}`;
}
