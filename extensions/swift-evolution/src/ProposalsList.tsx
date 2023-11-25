import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchProposals } from "./domain";
import ProposalGithubPage from "./ProposalGithubPage";

export type ViewModelStatusColor = "blue" | "orange" | "green" | "purple" | "red";

export type ProposalViewModel = {
  id: string;
  title: string;
  status: string;
  statusColor: ViewModelStatusColor;
  authors: {
    name: string;
    link: string;
  }[];
  implementations: {
    title: string;
    url: string;
  }[];
  reviewManagerName: string;
  reviewManagerProfileLink: string;
  swiftVersion?: string;
  scheduled?: string;
  isNew: boolean;

  keywords: string[];
  link: string;
  markdownLink: string;
};

function mapStatusColorToRaycastColor(color: ViewModelStatusColor): Color {
  switch (color) {
    case "blue":
      return Color.Blue;
    case "green":
      return Color.Green;
    case "orange":
      return Color.Orange;
    case "purple":
      return Color.Purple;
    case "red":
      return Color.Red;
    default:
      return Color.PrimaryText;
  }
}

export default function ProposalsList() {
  const [state, setState] = useState<{ proposals: ProposalViewModel[] }>({ proposals: [] });
  const [showsDetails, setShowDetails] = useState<boolean>(true);
  const ListItem = showsDetails ? DetailedProposalList : SimpleProposalList;

  useEffect(() => {
    async function fetch() {
      const proposals = await getProposals();
      setState((oldState) => ({
        ...oldState,
        proposals: proposals,
      }));
    }
    fetch();
  }, []);

  return (
    <List
      isLoading={state.proposals.length === 0}
      isShowingDetail={showsDetails}
      searchBarPlaceholder="Filter proposals by name, status, id, swift version or description"
    >
      {state.proposals.map((proposal) => (
        <ListItem
          key={proposal.id}
          proposal={proposal}
          toggleDetails={() => {
            setShowDetails(!showsDetails);
          }}
        />
      ))}
    </List>
  );
}

function SimpleProposalList(props: { proposal: ProposalViewModel; toggleDetails: () => void }) {
  const proposal = props.proposal;
  const { push } = useNavigation();
  return (
    <List.Item
      title={proposal.id}
      subtitle={proposal.title}
      accessories={[
        { tag: { value: proposal.status, color: mapStatusColorToRaycastColor(proposal.statusColor) } },
        { tag: { value: proposal.swiftVersion, color: Color.Orange } },
      ]}
      keywords={proposal.keywords}
      actions={
        <ActionPanel>
          <Action
            title="Read Proposal"
            icon={Icon.Airplane}
            onAction={() => push(<ProposalGithubPage markdownUrl={proposal.markdownLink} prUrl={proposal.link} />)}
          />
          <Action title="Toggle Details" icon={Icon.AlignLeft} onAction={props.toggleDetails} />
          <Action.OpenInBrowser url={proposal.link} />
          <Action.CopyToClipboard title="Copy URL" content={proposal.link} />
        </ActionPanel>
      }
    />
  );
}

function DetailedProposalList(props: { proposal: ProposalViewModel; toggleDetails: () => void }) {
  const proposal = props.proposal;
  const { push } = useNavigation();
  return (
    <List.Item
      title={(proposal.isNew ? "🆕 " : "") + proposal.title}
      keywords={proposal.keywords}
      actions={
        <ActionPanel>
          <Action
            title="Read Proposal"
            icon={Icon.Airplane}
            onAction={() => push(<ProposalGithubPage markdownUrl={proposal.markdownLink} prUrl={proposal.link} />)}
          />
          <Action title="Toggle Details" icon={Icon.AlignLeft} onAction={props.toggleDetails} />
          <Action.OpenInBrowser url={proposal.link} />
          <Action.CopyToClipboard title="Copy URL" content={proposal.link} />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={"ID"} text={proposal.id} />
              <List.Item.Detail.Metadata.Label title={"Title"} text={proposal.title} />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={proposal.status}
                  color={mapStatusColorToRaycastColor(proposal.statusColor)}
                />
              </List.Item.Detail.Metadata.TagList>
              {proposal.scheduled ? (
                <>
                  <List.Item.Detail.Metadata.Label title={"Scheduled"} text={proposal.scheduled} />
                </>
              ) : (
                <></>
              )}
              {proposal.swiftVersion ? (
                <>
                  <List.Item.Detail.Metadata.Label title={"Implemented in"} text={`Swift ${proposal.swiftVersion}`} />
                </>
              ) : (
                <></>
              )}
              <List.Item.Detail.Metadata.Separator />
              {proposal.authors.map((author, index) => {
                return (
                  <>
                    <List.Item.Detail.Metadata.Link
                      title={index === 0 ? `Author${proposal.authors.length > 1 ? "s" : ""}` : ""}
                      target={author.link}
                      text={author.name}
                      key={author.name}
                    />
                  </>
                );
              })}
              <List.Item.Detail.Metadata.Link
                title={"Review Manager"}
                target={proposal.reviewManagerProfileLink}
                text={proposal.reviewManagerName}
              />
              <List.Item.Detail.Metadata.Separator />
              {proposal.implementations.length > 0 ? (
                <>
                  {proposal.implementations.map((implementation, index) => {
                    return (
                      <>
                        <List.Item.Detail.Metadata.Link
                          title={index === 0 ? `Implementation${proposal.implementations.length > 1 ? "s" : ""}` : ""}
                          target={implementation.url}
                          text={implementation.title}
                          key={implementation.url}
                        />
                      </>
                    );
                  })}
                </>
              ) : (
                <></>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

async function getProposals(): Promise<ProposalViewModel[]> {
  try {
    return await fetchProposals();
  } catch (error) {
    showToast(Toast.Style.Failure, "Failed", (error as Error).message);
    return Promise.resolve([]);
  }
}
