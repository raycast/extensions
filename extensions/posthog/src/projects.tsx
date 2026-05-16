import { List } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";

import { getProject, listProjects, Project as ProjectType, ProjectDetail } from "./api/projects";

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(async () => (await listProjects()).results, [], {
    keepPreviousData: true,
    onError: (e) => showFailureToast(e, { title: "Couldn't load PostHog projects" }),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useCachedState<{ [id: number]: ProjectDetail }>("project-details", {});

  if (error) {
    return (
      <List>
        <List.EmptyView title="Check your API key and data region" description={error.message} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      onSelectionChange={setSelectedId}
      isShowingDetail
      throttle
    >
      {data ? (
        <List.Section>
          {data.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              detail={projectDetail[project.id]}
              isSelected={selectedId === project.id.toString()}
              onDetailUpdated={(detail) => setProjectDetail((prev) => ({ ...prev, [detail.id]: detail }))}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function ProjectRow({
  project,
  detail,
  isSelected,
  onDetailUpdated,
}: {
  project: ProjectType;
  detail: ProjectDetail | undefined;
  isSelected: boolean;
  onDetailUpdated: (data: ProjectDetail) => void;
}) {
  useCachedPromise((id: number) => getProject(id), [project.id], {
    execute: !detail && isSelected,
    onData: onDetailUpdated,
    onError: (e) => showFailureToast(e, { title: `Couldn't load project ${project.name}` }),
  });

  return (
    <List.Item
      title={project.name}
      id={project.id.toString()}
      detail={
        <List.Item.Detail
          isLoading={!detail}
          metadata={
            detail ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Name" text={project.name} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="ID" text={project.id.toString()} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Created At" text={detail.created_at} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Timezone" text={detail.timezone} />
                <List.Item.Detail.Metadata.Separator />
                {detail.person_display_name_properties && detail.person_display_name_properties.length > 0 && (
                  <>
                    <List.Item.Detail.Metadata.TagList title="Person Display Properties">
                      {detail.person_display_name_properties.map((prop) => (
                        <List.Item.Detail.Metadata.TagList.Item key={prop} text={prop} />
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
            ) : undefined
          }
        />
      }
    />
  );
}
