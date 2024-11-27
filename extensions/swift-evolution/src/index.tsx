import { SwiftProposalsRepository } from "./Data/SwiftProposalsRepository";
import { ProposalsQueryModel } from "./Domain/ProposalsQueryModel";
import ProposalsList from "./Navigation/ProposalsList";

const PRIMITIVE_DI_MAP = {
  ProposalsQueryModel: new ProposalsQueryModel(new SwiftProposalsRepository()),
};

export default function Main() {
  return <ProposalsList query={PRIMITIVE_DI_MAP.ProposalsQueryModel} />;
}
