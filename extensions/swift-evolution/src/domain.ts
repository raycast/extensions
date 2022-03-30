import { ProposalUI, ProposalUISectionItem } from "./index";
import fetch from "node-fetch";
import { Color, Icon } from "@raycast/api";

type DisplayableStatus = Pick<ProposalUISectionItem, "icon"> & { display: string; order: number };

const displayableStatusMap: Record<string, DisplayableStatus> = {
  ".awaitingReview": { display: "Awaiting Review", icon: { source: Icon.Clock, tintColor: Color.Orange }, order: 0 },
  ".scheduledForReview": {
    display: "Scheduled For Review",
    icon: { source: Icon.Calendar, tintColor: Color.Orange },
    order: 1,
  },
  ".activeReview": { display: "In Review", icon: { source: Icon.Bubble, tintColor: Color.Orange }, order: 2 },
  ".accepted": { display: "Accepted", icon: { source: Icon.Checkmark, tintColor: Color.Green }, order: 3 },
  ".acceptedWithRevisions": { display: "Accepted", icon: { source: Icon.Checkmark, tintColor: Color.Green }, order: 4 },
  ".previewing": { display: "Previewing", icon: { source: Icon.Checkmark, tintColor: Color.Magenta }, order: 5 },
  ".implemented": { display: "Implemented", icon: { source: Icon.Checkmark, tintColor: Color.Blue }, order: 6 },
  ".returnedForRevision": {
    display: "Returned",
    icon: { source: Icon.ArrowClockwise, tintColor: Color.Purple },
    order: 7,
  },
  ".deferred": { display: "Deferred", icon: { source: Icon.Calendar, tintColor: Color.Purple }, order: 8 },
  ".rejected": { display: "Rejected", icon: { source: Icon.ExclamationMark, tintColor: Color.Red }, order: 9 },
  ".withdrawn": { display: "Withdrawn", icon: { source: Icon.Trash, tintColor: Color.Red }, order: 10 },
};

type ProposalJson = {
  id: string;
  title: string;
  summary: string;
  status: {
    end: string | undefined;
    start: string | undefined;
    state: string;
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

export async function fetchProposals(): Promise<ProposalUI> {
  const toUI = (proposals: ProposalJson[]): ProposalUI => {
    const proposalUI = proposals.sort(compareStatus).reduce<ProposalUI>(
      (prev, current) => {
        const sectionTitle = getDisplayableStatus(current).display;
        if (isNewSection(sectionTitle, prev.sections)) {
          prev.sections.push({
            title: sectionTitle,
            items: [],
          });
        }
        prev.sections[prev.sections.length - 1].items.push(toItemUI(current));
        return prev;
      },
      { sections: [] }
    );
    return proposalUI;
  };

  const compareStatus = (x: ProposalJson, y: ProposalJson) =>
    getDisplayableStatus(x).order - getDisplayableStatus(y).order;

  const getDisplayableStatus = (proposal: ProposalJson): DisplayableStatus => {
    const jsonStatus = proposal.status.state;
    let display = displayableStatusMap[jsonStatus];
    if (display === undefined) {
      display = {
        display: jsonStatus,
        icon: "🚧",
        order: -1,
      };
    }
    return display;
  };

  const isNewSection = (newSectionTitle: string, sections: ProposalUI["sections"]) => {
    return sections.find((section) => section.title == newSectionTitle) === undefined;
  };

  const toItemUI = (proposal: ProposalJson): ProposalUISectionItem => {
    const id = proposal.id;
    const version = proposal.status.version ?? "";
    const title = proposal.title.trim();
    return {
      accessoryIcon: "next.png",
      accessoryTitle: getRepos(proposal),
      id,
      icon: getDisplayableStatus(proposal).icon,
      title,
      subtitle: version,
      keywords: getKeywords(proposal),
      link: "https://github.com/apple/swift-evolution/blob/main/proposals/" + proposal.link,
      markdownLink: "https://raw.githubusercontent.com/apple/swift-evolution/main/proposals/" + proposal.link,
    };
  };

  const getRepos = (proposal: ProposalJson) => {
    const repos = (proposal.implementation ?? []).map((x) => x.repository);
    return repos
      .reduce((prev, current) => {
        if (current === undefined) return prev;
        if (prev.includes(current)) return prev;
        prev.push(current);
        return prev;
      }, [] as string[])
      .join("|");
  };

  const getKeywords = (proposal: ProposalJson) => {
    const statusKeywords = getDisplayableStatus(proposal).display.split(" ");
    const summaryKeywords = proposal.summary.trim().split(" ");
    const titleKeywords = proposal.title.trim().split(" ");
    const repoKeywords = getRepos(proposal).split("|");
    return [proposal.id, proposal.status.version, statusKeywords, summaryKeywords, titleKeywords, repoKeywords]
      .flat()
      .filter((x) => x !== undefined) as string[];
  };

  try {
    const response = await fetch("https://data.swift.org/swift-evolution/proposals");
    const json = (await response.json()) as ProposalJson[];
    return toUI(json);
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
