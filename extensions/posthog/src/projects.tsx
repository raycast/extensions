import { List } from "@raycast/api";
import { usePostHogClient } from "../helpers/usePostHogClient";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import ErrorHandler from "./error-handler";

type SearchResult = {
  count: number;
  next: null;
  previous: null;
  results: Project[];
};

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

export default function Command() {
  const { data, isLoading, error } = usePostHogClient<SearchResult>("projects");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useCachedState<{ [id: number]: ProjectDetail }>("project-details", {});

  const handleOnDetailUpdated = (detail: ProjectDetail) => {
    setProjectDetail((prev) => ({ ...prev, [detail.id]: detail }));
  };

  return (
    <ErrorHandler error={error}>
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search projects..."
        onSelectionChange={setSelectedId}
        isShowingDetail={true}
        throttle
      >
        {data ? (
          <List.Section>
            {data.results.map((project) => (
              <Project
                key={project.id}
                project={project}
                detail={projectDetail[project.id]}
                isSelected={selectedId === project.id.toString()}
                onDetailUpdated={handleOnDetailUpdated}
              />
            ))}
          </List.Section>
        ) : null}
      </List>
    </ErrorHandler>
  );
}

const Project = ({
  project,
  detail,
  isSelected,
  onDetailUpdated,
}: {
  project: Project;
  detail: ProjectDetail;
  isSelected: boolean;
  onDetailUpdated: (data: ProjectDetail) => void;
}) => {
  usePostHogClient<ProjectDetail>(`projects/${project.id}`, {
    execute: !detail && isSelected,
    onData: onDetailUpdated,
  });

  return (
    <List.Item
      title={project.name}
      id={project.id.toString()}
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
