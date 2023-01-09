import { ProposalUI, ProposalUISectionItem } from "./index";
import fetch from "node-fetch";
import { Color, Icon } from "@raycast/api";
import { ProposalJson, fetchProposals as fetchRemoteProposals, Status } from "./api";

type DisplayableStatus = Pick<ProposalUISectionItem, "icon"> & { display: string };

const statusOrdering: Record<Status, number> = {
  ".awaitingReview": 0,
  ".scheduledForReview": 1,
  ".activeReview": 2,
  ".accepted": 3,
  ".acceptedWithRevisions": 4,
  ".previewing": 5,
  ".implemented": 6,
  ".returnedForRevision": 7,
  ".deferred": 8,
  ".rejected": 9,
  ".withdrawn": 10,
};

const displayableStatusMap: Record<Status, DisplayableStatus> = {
  ".awaitingReview": { display: "Awaiting Review", icon: { source: Icon.Clock, tintColor: Color.Orange } },
  ".scheduledForReview": {
    display: "Scheduled For Review",
    icon: { source: Icon.Calendar, tintColor: Color.Orange },
  },
  ".activeReview": { display: "In Review", icon: { source: Icon.Bubble, tintColor: Color.Orange } },
  ".accepted": { display: "Accepted", icon: { source: Icon.Checkmark, tintColor: Color.Green } },
  ".acceptedWithRevisions": { display: "Accepted", icon: { source: Icon.Checkmark, tintColor: Color.Green } },
  ".previewing": { display: "Previewing", icon: { source: Icon.Checkmark, tintColor: Color.Magenta } },
  ".implemented": { display: "Implemented", icon: { source: Icon.Checkmark, tintColor: Color.Blue } },
  ".returnedForRevision": {
    display: "Returned",
    icon: { source: Icon.ArrowClockwise, tintColor: Color.Purple },
  },
  ".deferred": { display: "Deferred", icon: { source: Icon.Calendar, tintColor: Color.Purple } },
  ".rejected": { display: "Rejected", icon: { source: Icon.ExclamationMark, tintColor: Color.Red } },
  ".withdrawn": { display: "Withdrawn", icon: { source: Icon.Trash, tintColor: Color.Red } },
};

export async function fetchProposals(): Promise<ProposalUI> {
  const toUI = (proposals: ProposalJson[]): ProposalUI => {
    const proposalUI = proposals.sort(compareStatus).reduce<ProposalUI>(
      (proposalsUI, current) => {
        const sectionTitle = getDisplayableStatus(current).display;
        if (isNewSection(sectionTitle, proposalsUI.sections)) {
          proposalsUI.sections.push({
            title: sectionTitle,
            items: [],
          });
        }
        proposalsUI.sections[proposalsUI.sections.length - 1].items.push(toItemUI(current));
        return proposalsUI;
      },
      { sections: [] }
    );
    return proposalUI;
  };

  const compareStatus = (x: ProposalJson, y: ProposalJson) =>
    statusOrdering[x.status.state] - statusOrdering[y.status.state];

  const getDisplayableStatus = (proposal: ProposalJson): DisplayableStatus => {
    const jsonStatus = proposal.status.state;
    let display = displayableStatusMap[jsonStatus];
    if (display === undefined) {
      display = {
        display: jsonStatus,
        icon: "🚧",
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
      accessories: [{text: getRepos(proposal)}, {icon: Icon.ArrowRight}],
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
    const json = await fetchRemoteProposals();
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
