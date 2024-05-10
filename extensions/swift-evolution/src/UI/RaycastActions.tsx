import { Action, ActionPanel, Icon } from "@raycast/api";

export default function RaycastActions(props: {
  link: string;
  onToggleDetails: () => void;
  onRead: () => void;
}) {
  const link = props.link;
  // const push = props.push;
  return (
    <ActionPanel>
      <Action
        key={"read"}
        title="Read Proposal"
        icon={Icon.Airplane}
        // onAction={() => push(<ProposalGithubPage markdownUrl={proposal.markdownLink} prUrl={proposal.link} />)}
        onAction={props.onRead}
      />
      <Action title="Toggle Details" icon={Icon.AlignLeft} onAction={props.onToggleDetails} />
      <Action.OpenInBrowser key={"browser"} url={link} />
      <Action.CopyToClipboard key={"copy"} title="Copy URL" content={link} />
    </ActionPanel>
  );
}