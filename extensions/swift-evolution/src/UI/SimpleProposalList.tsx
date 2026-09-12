import { Color, List } from "@raycast/api";
import { ProposalDataModel } from "../Domain/ProposalDataModel";
import RaycastActions from "./RaycastActions";
import { mapStatusToRaycastColor } from "./Colors";

export default function SimpleProposalList(props: {
  proposal: ProposalDataModel;
  toggleDetails: () => void;
  pushMarkdown: () => void;
}) {
  const proposal = props.proposal;
  const pushMarkdown = props.pushMarkdown;
  return (
    <List.Item
      title={proposal.id}
      subtitle={proposal.title}
      accessories={[
        { tag: { value: proposal.status, color: mapStatusToRaycastColor(proposal.status) } },
        { tag: { value: proposal.swiftVersion, color: Color.Orange } },
      ]}
      keywords={proposal.keywords}
      actions={<RaycastActions link={proposal.link} onToggleDetails={props.toggleDetails} onRead={pushMarkdown} />}
    />
  );
}
