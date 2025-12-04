import { ProposalDataModel } from "./ProposalDataModel";

export interface ProposalsRepository {
  getAllProposals(): Promise<ProposalDataModel[]>;
}
