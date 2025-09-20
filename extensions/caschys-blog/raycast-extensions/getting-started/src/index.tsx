import { ActionPanel, Action, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Section title="Basics">
        <LinkListItem title="Familiarize yourself with Raycast" link="https://raycast.com/manual" />
        <LinkListItem title="Install extensions from our public store" link="https://www.raycast.com/store" />
        <LinkListItem title="Build your own extensions with our API" link="https://developers.raycast.com" />
        <LinkListItem title="Invite your teammates" link="raycast://organizations/CaschysBlog/manage" />
      </List.Section>
      <List.Section title="Next Steps">
        <LinkListItem title="Join the Raycast community" link="https://raycast.com/community" />
        <LinkListItem title="Stay up to date via Twitter" link="https://twitter.com/raycastapp" />
      </List.Section>
    </List>
  );
}

function LinkListItem(props: { title: string; link: string }) {
  return (
    <List.Item
      title={props.title}
      icon={Icon.Link}
      accessories={[{ text: props.link }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={props.link} />
          <Action.CopyToClipboard title="Copy Link" content={props.link} />
        </ActionPanel>
      }
    />
  );
}
