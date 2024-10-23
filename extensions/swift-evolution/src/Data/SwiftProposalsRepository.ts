import { ProposalDataModel, Status } from "../Domain/ProposalDataModel";
import { ProposalsRepository } from "../Domain/ProposalsRepository";
import { ProposalJson, fetchProposals as fetchRemoteProposals } from "../Data/api";

export class SwiftProposalsRepository implements ProposalsRepository {
  async getAllProposals(): Promise<ProposalDataModel[]> {
    try {
      const json = await fetchRemoteProposals();
      return this.convertToDataModels(json);
    } catch (error) {
      console.error(error);
      return Promise.reject(error);
    }
  }

  private convertToDataModels(proposals: ProposalJson[]): ProposalDataModel[] {
    const proposalsViewModel: ProposalDataModel[] = proposals
      .map((json) => {
        console.log(json);
        const viewModel: ProposalDataModel = {
          id: json.id,
          authors: json.authors.map((x) => ({ ...x, name: x.name.trim() })),
          implementations: this.getImplementations(json),
          reviewManagers: json.reviewManagers.map((x) => ({ ...x, name: x.name.trim() })),
          link: "https://github.com/apple/swift-evolution/blob/main/proposals/" + json.link,
          markdownLink: "https://raw.githubusercontent.com/apple/swift-evolution/main/proposals/" + json.link,
          keywords: this.getKeywords(json),
          status: json.status.state as Status,
          title: json.title.trim(),
          swiftVersion: json.status.version,
          scheduled:
            json.status.start !== undefined && json.status.end !== undefined
              ? this.convertStartEndToScheduled(json.status.start, json.status.end)
              : undefined,
          isNew: this.isNew(json),
        };
        return viewModel;
      })
      .reverse();
    return proposalsViewModel;
  }

  private getKeywords(proposal: ProposalJson) {
    const statusKeywords = proposal.status.state.trim().split(" ");
    const summaryKeywords = proposal.summary.trim().split(" ");
    const titleKeywords = proposal.title.trim().split(" ");
    const repoKeywords = this.getRepos(proposal);
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

  private getRepos(proposal: ProposalJson): string[] {
    const repos = (proposal.implementation ?? []).map((x) => x.repository);
    return repos.reduce((repos, repo) => {
      if (repo === undefined) return repos;
      if (repos.includes(repo)) return repos;
      repos.push(repo);
      return repos;
    }, [] as string[]);
  }

  private getImplementations(proposal: ProposalJson): { title: string; url: string }[] {
    const implementations = proposal.implementation ?? [];
    const initialValue: { title: string; url: string }[] = [];
    return implementations.reduce((accumulator, x) => {
      const mapped = {
        title: `${x.repository}#${x.id}`,
        url: `https://github.com/${x.account}/${x.repository}/${x.type}/${x.id}`,
      };
      // Ignore duplications
      if (accumulator.find((impl) => impl.url == mapped.url)) {
        return accumulator;
      }
      return accumulator.concat(mapped);
    }, initialValue);
  }

  private isNew(proposal: ProposalJson): boolean {
    if (proposal.status.start === undefined) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const start = new Date(proposal.status.start);
    console.log(start.valueOf() - sevenDaysAgo.valueOf());
    return start > sevenDaysAgo && start < new Date();
  }

  private convertStartEndToScheduled(startDate: string, endDate: string): string {
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
}
