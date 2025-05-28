import { ProposalDataModel, Status } from "./ProposalDataModel";
import { ProposalsRepository } from "./ProposalsRepository";

export class ProposalsQueryModel {
  private repository: ProposalsRepository;
  private models: ProposalDataModel[] = [];

  constructor(repository: ProposalsRepository) {
    this.repository = repository;
  }

  getAllModels(): ProposalDataModel[] {
    return this.models;
  }

  getModelsByStatus(status: Status): ProposalDataModel[] {
    return this.models.filter((model) => model.status === status);
  }

  async fetchProposals(): Promise<ProposalDataModel[]> {
    try {
      this.models = await this.repository.getAllProposals();
      return this.models;
    } catch (error) {
      console.error(error);
      return Promise.reject(error);
    }
  }
}
