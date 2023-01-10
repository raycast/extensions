import { ActionPanel, Action, List, showToast, Toast, Icon, useNavigation, Detail, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchMarkdown, fetchProposals } from "./domain";

export type ProposalViewModel = {
  id: string;
  status: string;
  title: string;
  authorName: string;
  reviewManagerName: string;
  swiftVersion?: string;
  repos?: string;

  keywords: string[];
  link: string;
  markdownLink: string;
};

export default function ArticleList() {
  const [state, setState] = useState<{ proposals: ProposalViewModel[] }>({ proposals: [] });
  const [showsDetails, setShowDetails] = useState<boolean>(false);

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
      searchBarPlaceholder="Filter proposals by name"
    >
      {state.proposals.map((proposal) => (
        <ArticleListItem
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

function ArticleListItem(props: { proposal: ProposalViewModel; toggleDetails: () => void }) {
  const proposal = props.proposal;
  const { push } = useNavigation();
  return (
    <List.Item
      title={proposal.status}
      subtitle={proposal.title}
      accessories={[{tag: proposal.repos},{tag: proposal.swiftVersion}]}
      keywords={proposal.keywords}
      actions={
        <ActionPanel>
          <Action
            title="Details"
            icon={Icon.AppWindowList}
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
              <List.Item.Detail.Metadata.TagList title="Type">
                <List.Item.Detail.Metadata.TagList.Item text="Electric" color={"#eed535"} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title={"ID"} text={proposal.id}/>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title={"Title"} text={proposal.title} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title={"Status"} text={{value: proposal.status, color: Color.Green}} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title={"Author"}
                icon={Icon.Person}
                text={{ value: proposal.authorName, color: Color.Yellow }}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title={"Review Manager"}
                icon={Icon.PersonCircle}
                text={{ value: proposal.reviewManagerName, color: Color.Purple }}
              />
              <List.Item.Detail.Metadata.Separator />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function ProposalGithubPage(props: { markdownUrl: string; prUrl: string }) {
  const [state, setState] = useState<{ markdown: string }>({ markdown: "" });

  useEffect(() => {
    async function fetch() {
      const markdown = await fetchMarkdown(props.markdownUrl);
      setState(() => ({
        markdown,
      }));
    }
    fetch();
  }, []);

  return (
    <Detail
      isLoading={state.markdown.length === 0}
      markdown={state.markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={props.prUrl} />
          <Action.CopyToClipboard title="Copy URL" content={props.prUrl} />
        </ActionPanel>
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
