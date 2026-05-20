import { List } from "@raycast/api";
import { usePostHogClient } from "../helpers/usePostHogClient";
import { useCachedState } from "@raycast/utils";
import { useContext, useState } from "react";
import { ProjectsContext, WithProjects } from "../helpers/ProjectsContext";
import { accountLabel, encodeProjectSelection } from "../helpers/account-model";
import { AuthenticatedPostHogAccount } from "../helpers/posthog-auth";

type Project = {
  id: number;
  name: string;
};

type ProjectDetail = {
  id: number;
  uuid: string;
  created_at: string;
  updated_at: string;
  is_demo: boolean;
  timezone: string;
  slack_incoming_webhook: string;
  person_display_name_properties: string[];
};

function Projects() {
  const { projectGroups } = useContext(ProjectsContext);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useCachedState<{ [selection: string]: ProjectDetail }>(
    "project-details",
    {}
  );

  const handleOnDetailUpdated = (selection: string, detail: ProjectDetail) => {
    setProjectDetail((prev) => ({ ...prev, [selection]: detail }));
  };

  return (
    <List
      searchBarPlaceholder="Search projects..."
      onSelectionChange={setSelectedValue}
      isShowingDetail={true}
      throttle
    >
      {projectGroups.map((group) => (
        <List.Section key={group.account.id} title={accountLabel(group.account)}>
          {group.projects.map((project) => {
            const selection = encodeProjectSelection(group.account.id, project.id);

            return (
              <Project
                key={selection}
                account={group.account}
                project={project}
                selection={selection}
                detail={projectDetail[selection]}
                isSelected={selectedValue === selection}
                onDetailUpdated={(detail) => handleOnDetailUpdated(selection, detail)}
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <WithProjects>
      <Projects />
    </WithProjects>
  );
}

const Project = ({
  account,
  project,
  selection,
  detail,
  isSelected,
  onDetailUpdated,
}: {
  account: AuthenticatedPostHogAccount;
  project: Project;
  selection: string;
  detail: ProjectDetail;
  isSelected: boolean;
  onDetailUpdated: (data: ProjectDetail) => void;
}) => {
  usePostHogClient<ProjectDetail>(`projects/${project.id}`, {
    account,
    execute: !detail && isSelected,
    onData: onDetailUpdated,
  });

  return (
    <List.Item
      title={project.name}
      id={selection}
      detail={
        <List.Item.Detail
          isLoading={!detail}
          metadata={
            detail && (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Name" text={project.name} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="ID" text={project.id.toString()} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Created At" text={detail.created_at} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Timezone" text={detail.timezone} />
                <List.Item.Detail.Metadata.Separator />
                {detail.person_display_name_properties && (
                  <>
                    <List.Item.Detail.Metadata.TagList title="Industries">
                      {detail.person_display_name_properties.map((properties) => (
                        <List.Item.Detail.Metadata.TagList.Item key={properties} text={properties} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                  </>
                )}
                {detail.slack_incoming_webhook && (
                  <List.Item.Detail.Metadata.Link
                    title="Slack Webhook"
                    target={detail.slack_incoming_webhook}
                    text={detail.slack_incoming_webhook}
                  />
                )}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
    />
  );
};
