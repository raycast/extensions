import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  Icon,
  useNavigation,
  Detail,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchMarkdown, fetchProposals } from "./domain";

export type ProposalUI = {
  sections: {
    // sectioned by status
    title: string;
    items: ProposalUISectionItem[];
  }[];
};

export type ProposalUISectionItem = {
  id: string;
  title: string;
  // swift version if implemented, schedule period if in review (Not yet implemented)
  subtitle: string | undefined;
  icon: { source: Icon; tintColor: Color } | string;
  // Repo
  accessoryTitle: string | undefined;
  // repo icon
  accessoryIcon: string | undefined;
  // status, id, summary, title
  keywords: string[];
  link: string;
  markdownLink: string;
};

export default function ArticleList() {
  const [state, setState] = useState<{ proposals: ProposalUI }>({ proposals: { sections: [] } });

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
    <List isLoading={state.proposals.sections.length === 0} searchBarPlaceholder="Filter proposals by name">
      {state.proposals.sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((proposal) => (
            <ArticleListItem key={proposal.id} proposal={proposal} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ArticleListItem(props: { proposal: ProposalUISectionItem }) {
  const proposal = props.proposal;
  const { push } = useNavigation();

  return (
    <List.Item
      {...proposal}
      accessoryIcon={{ source: Icon.ArrowRight }}
      actions={
        <ActionPanel>
          <ActionPanel.Item
            title="Details"
            onAction={() => push(<ProposalGithubPage markdownUrl={proposal.markdownLink} prUrl={proposal.link} />)}
          />
          <OpenInBrowserAction url={proposal.link} />
          <CopyToClipboardAction title="Copy URL" content={proposal.link} />
        </ActionPanel>
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
          <OpenInBrowserAction url={props.prUrl} />
          <CopyToClipboardAction title="Copy URL" content={props.prUrl} />
        </ActionPanel>
      }
    />
  );
}

async function getProposals(): Promise<ProposalUI> {
  try {
    return await fetchProposals();
  } catch (error) {
    showToast(ToastStyle.Failure, "Failed", (error as Error).message);
    return Promise.resolve({ sections: [] });
  }
}
