import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { ListModrinthProject, ModrinthProject } from "../../search-mods";
import { ProjectMetadata } from "../project-details";

type Props = {
  listProject: ListModrinthProject;
  isLoading: boolean;
  isSelected: false;
};

type SelectedProps = {
  listProject: ListModrinthProject;
  project: ModrinthProject | undefined;
  isLoading: boolean;
  isSelected: true;
};

export function isSelectedProps(props: Props | SelectedProps): props is SelectedProps {
  return (props as SelectedProps).project !== undefined;
}

export function ModEntry(props: Props | SelectedProps) {
  const { listProject } = props;

  const createBody = (body?: string) => {
    return `**${isSelectedProps(props) ? `<img src="${listProject.icon_url}" width="100" />` : ""}**\n\n${body}`;
  };

  return (
    <List.Item
      icon={listProject.icon_url ? listProject.icon_url : undefined}
      title={listProject.title}
      accessories={[{ text: listProject.author }]}
      detail={
        <List.Item.Detail
          isLoading={props.isLoading && props.isSelected}
          markdown={createBody(isSelectedProps(props) ? props.project?.body : "")}
          metadata={<ProjectMetadata project={listProject} />}
        />
      }
      id={listProject.slug}
      actions={<ModActions {...props} />}
    />
  );
}

function ModActions(props: Props | SelectedProps) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        url={`https://modrinth.com/${props.listProject.project_type}/${props.listProject.slug}`}
        title="Open in Modrinth"
        shortcut={{ modifiers: ["cmd"], key: "m" }}
      />
      <ActionPanel.Section title="Links">
        {isSelectedProps(props) && props.project?.source_url && (
          <Action.OpenInBrowser
            title="Source Code"
            url={props.project.source_url}
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        )}
        {isSelectedProps(props) && props.project?.issues_url && (
          <Action.OpenInBrowser
            title="Issues"
            url={props.project.issues_url}
            icon={Icon.Warning}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
        )}
        {isSelectedProps(props) && props.project?.wiki_url && (
          <Action.OpenInBrowser
            title="See Wiki"
            url={props.project.wiki_url}
            icon={Icon.Book}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        )}
        {isSelectedProps(props) && props.project?.discord_url && (
          <Action.OpenInBrowser
            title="Join Discord"
            url={props.project.discord_url}
            icon={Icon.TwoPeople}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Donate">
        {isSelectedProps(props) &&
          props.project?.donation_urls &&
          props.project.donation_urls.map((donation) => {
            return <Action.OpenInBrowser key={donation.id} title={donation.platform} url={donation.url} />;
          })}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
