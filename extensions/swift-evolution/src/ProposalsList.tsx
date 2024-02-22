import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
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
  const [showsDetails, setShowDetails] = useCachedState<boolean>("showDetails", true);

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

  function ListItem(props: { proposal: ProposalViewModel; toggleDetails: () => void }) {
    const proposal = props.proposal;

    const { push } = useNavigation();
    const accessories: List.Item.Accessory[] = [
      { tag: { value: proposal.status, color: mapStatusColorToRaycastColor(proposal.statusColor) } },
    ];
    if (proposal.swiftVersion) {
      accessories.push({ tag: { value: proposal.swiftVersion, color: Color.Orange } });
    }
    return (
      <List.Item
        title={showsDetails ? (proposal.isNew ? "🆕 " : "") + proposal.title : proposal.id}
        subtitle={!showsDetails ? proposal.title : ""}
        accessories={!showsDetails ? accessories : null}
        keywords={proposal.keywords}
        actions={
          <ActionPanel>
            <Action
              title="Read Proposal"
              icon={Icon.Airplane}
              onAction={() => push(<ProposalGithubPage markdownUrl={proposal.markdownLink} prUrl={proposal.link} />)}
            />
            <Action
              title="Toggle Details"
              icon={Icon.AlignLeft}
              onAction={props.toggleDetails}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
            <Action.OpenInBrowser shortcut={Keyboard.Shortcut.Common.Open} url={proposal.link} />
            <Action.CopyToClipboard
              title="Copy URL"
              content={proposal.link}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
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
                    <List.Item.Detail.Metadata.Link
                      title={index === 0 ? `Author${proposal.authors.length > 1 ? "s" : ""}` : ""}
                      target={author.link}
                      text={author.name}
                      key={author.name}
                    />
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
                        <List.Item.Detail.Metadata.Link
                          title={index === 0 ? `Implementation${proposal.implementations.length > 1 ? "s" : ""}` : ""}
                          target={implementation.url}
                          text={implementation.title}
                          key={implementation.url}
                        />
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

async function getProposals(): Promise<ProposalViewModel[]> {
  try {
    return await fetchProposals();
  } catch (error) {
    showToast(Toast.Style.Failure, "Failed", (error as Error).message);
    return Promise.resolve([]);
  }
}
