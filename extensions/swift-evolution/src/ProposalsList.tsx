import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchMarkdown, fetchProposals } from "./domain";
import ProposalGithubPage from "./ProposalGithubPage";

export type ViewModelStatusColor = "blue" | "orange" | "green" | "purple" | "red";

export type ProposalViewModel = {
  id: string;
  title: string;
  status: string;
  statusColor: ViewModelStatusColor;
  authorsName: string[];
  reviewManagerName: string;
  reviewManagerProfileLink: string;
  swiftVersion?: string;
  scheduled?: string;
  repos: string[];

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
  const accessories: any[] = [];
  if (proposal.swiftVersion) {
    accessories.push({ tag: `Swift ${proposal.swiftVersion}` });
  }
  if (proposal.scheduled) {
    accessories.push({ tag: `${proposal.scheduled}` });
  }
  return (
    <List.Item
      title={proposal.status}
      subtitle={proposal.title}
      accessories={accessories}
      keywords={proposal.keywords}
      actions={
        <ActionPanel>
          <Action
            title="Read Proposal"
            icon={Icon.Airplane}
            onAction={() => push(<ProposalGithubPage markdownUrl={proposal.markdownLink} prUrl={proposal.link} />)}
          />
          <Action title="Toggle details" icon={Icon.AlignLeft} onAction={props.toggleDetails} />
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
      title={proposal.title}
      keywords={proposal.keywords}
      actions={
        <ActionPanel>
           <Action
            title="Read Proposal"
            icon={Icon.Airplane}
            onAction={() => push(<ProposalGithubPage markdownUrl={proposal.markdownLink} prUrl={proposal.link} />)}
          />
          <Action title="Toggle details" icon={Icon.AlignLeft} onAction={props.toggleDetails} />
          <Action.OpenInBrowser url={proposal.link} />
          <Action.CopyToClipboard title="Copy URL" content={proposal.link} />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={"ID"} text={proposal.id} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title={"Title"} text={proposal.title} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title={`Author${proposal.authorsName.length > 1 ? "s" : ""}`}
                text={{ value: proposal.authorsName.join(","), color: Color.Yellow }}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link
                title={"Review Manager"}
                target={proposal.reviewManagerProfileLink}
                text={proposal.reviewManagerName}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={proposal.status}
                  color={mapStatusColorToRaycastColor(proposal.statusColor)}
                />
              </List.Item.Detail.Metadata.TagList>
              {proposal.scheduled ? (
                <>
                  <List.Item.Detail.Metadata.Label title={"Scheduled"} text={proposal.scheduled} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              ) : (
                <></>
              )}
              {proposal.swiftVersion ? (
                <>
                  <List.Item.Detail.Metadata.Label title={"Implemented in"} text={`Swift ${proposal.swiftVersion}`} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              ) : (
                <></>
              )}
              {proposal.repos.length > 0 ? (
                <>
                  <List.Item.Detail.Metadata.TagList title={`Repo${proposal.repos.length > 1 ? "s" : ""}`}>
                    {proposal.repos.map((repo) => {
                      return <List.Item.Detail.Metadata.TagList.Item text={repo} color={Color.Brown} key={repo}/>;
                    })}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
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
