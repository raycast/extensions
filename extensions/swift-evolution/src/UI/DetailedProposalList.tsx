import { List } from "@raycast/api";
import { ProposalDataModel } from "../Domain/ProposalDataModel";
import RaycastActions from "./RaycastActions";
import { mapStatusToRaycastColor } from "./Colors";

function MetadataTags(props: { proposal: ProposalDataModel }) {
  const proposal = props.proposal;
  return (
    <List.Item.Detail.Metadata.TagList title="Status">
      <List.Item.Detail.Metadata.TagList.Item
        key={proposal.status}
        text={proposal.status}
        color={mapStatusToRaycastColor(proposal.status)}
      />
    </List.Item.Detail.Metadata.TagList>
  );
}

function MetadataScheduled(props: { proposal: ProposalDataModel }) {
  const proposal = props.proposal;
  return <List.Item.Detail.Metadata.Label key={"scheduled"} title={"Scheduled"} text={proposal.scheduled} />;
}

function MetadataSwiftVersion(props: { proposal: ProposalDataModel }) {
  const proposal = props.proposal;
  return (
    <List.Item.Detail.Metadata.Label
      key={"swiftversion"}
      title={"Implemented in"}
      text={`Swift ${proposal.swiftVersion}`}
    />
  );
}

function MetadataAuthors(props: { proposal: ProposalDataModel }) {
  const proposal = props.proposal;
  return (
    <>
      {proposal.authors.map((author, index) => {
        return (
          <List.Item.Detail.Metadata.Link
            title={index === 0 ? `Author${proposal.authors.length > 1 ? "s" : ""}` : ""}
            target={author.link}
            text={author.name}
            key={author.name}
          />
        );
      })}
    </>
  );
}

function MetadataReviewManagers(props: { proposal: ProposalDataModel }) {
  const proposal = props.proposal;
  return (
    <>
      {proposal.reviewManagers.map((author, index) => {
        return (
          <List.Item.Detail.Metadata.Link
            title={index === 0 ? `Review Manager${proposal.reviewManagers.length > 1 ? "s" : ""}` : ""}
            target={author.link}
            text={author.name}
            key={author.name}
          />
        );
      })}
    </>
  );
}

function MetadataImplementations(props: { proposal: ProposalDataModel }) {
  const proposal = props.proposal;
  return (
    <>
      {proposal.implementations.map((implementation, index) => {
        return (
          <List.Item.Detail.Metadata.Link
            title={index === 0 ? `Implementation${proposal.implementations.length > 1 ? "s" : ""}` : ""}
            target={implementation.url}
            text={implementation.title}
            key={implementation.url}
          />
        );
      })}
    </>
  );
}

function Metadata(props: { proposal: ProposalDataModel }) {
  const proposal = props.proposal;
  return (
    <List.Item.Detail.Metadata key={"metadata"}>
      <List.Item.Detail.Metadata.Label key={"id"} title={"ID"} text={proposal.id} />
      <List.Item.Detail.Metadata.Label key={"title"} title={"Title"} text={proposal.title} />
      <MetadataTags key={"tags"} proposal={proposal} />
      {props.proposal.scheduled ? <MetadataScheduled proposal={proposal} /> : <></>}
      {props.proposal.swiftVersion ? <MetadataSwiftVersion proposal={proposal} /> : <></>}
      <List.Item.Detail.Metadata.Separator key={"separator1"} />
      <MetadataAuthors key={"authors"} proposal={proposal} />
      <MetadataReviewManagers key={"reviewmanagers"} proposal={proposal} />
      <List.Item.Detail.Metadata.Separator key={"separator2"} />
      {props.proposal.implementations.length > 0 ? <MetadataImplementations proposal={proposal} /> : <></>}
    </List.Item.Detail.Metadata>
  );
}

export default function DetailedProposalList(props: {
  proposal: ProposalDataModel;
  toggleDetails: () => void;
  pushMarkdown: () => void;
}) {
  const proposal = props.proposal;
  const toggleDetails = props.toggleDetails;
  const pushMarkdown = props.pushMarkdown;
  return (
    <List.Item
      key={proposal.id}
      title={(proposal.isNew ? "🆕 " : "") + proposal.title}
      keywords={proposal.keywords}
      actions={<RaycastActions link={proposal.link} onToggleDetails={toggleDetails} onRead={pushMarkdown} />}
      detail={<List.Item.Detail metadata={<Metadata proposal={proposal} />} />}
    />
  );
}
