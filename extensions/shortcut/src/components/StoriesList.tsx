import { List } from "@raycast/api";
import { StorySlim } from "@useshortcut/client";
import { useMemo } from "react";
import { useProjectMap, useWorkflowMap } from "../hooks";
import StoryListItem from "./StoryListItem";

export default function StoriesList({
  stories,
  isLoading,
  mutate,
  error,
}: {
  stories: StorySlim[] | undefined;
  isLoading: boolean;
  mutate?: () => void;
  error: Error | undefined;
}) {
  const projectIdMap = useProjectMap();
  const workflowMap = useWorkflowMap();

  const possibleWorkflowIdsFromStories = useMemo(() => {
    const workflowIds = (stories ?? []).map((story) => story.workflow_id);
    return Array.from(new Set(workflowIds));
  }, [stories]);

  const groupedStoriesByWorkflowStateId = useMemo(() => {
    if (!workflowMap) return [];

    return (stories ?? []).reduce((acc, story) => {
      return {
        ...acc,
        [story.workflow_state_id]: [...(acc[story.workflow_state_id] ?? []), story],
      };
    }, {} as { [key: number]: StorySlim[] });
  }, [workflowMap, stories]);

  return (
    <List isLoading={isLoading && !error}>
      {error && <List.EmptyView title="Error" description={error.message} />}

      {!error &&
        possibleWorkflowIdsFromStories.map((workflowId) => {
          const workflow = workflowMap[workflowId];

          return workflow?.states.map((state) => {
            const stories = groupedStoriesByWorkflowStateId[state.id] || [];

            return (
              <List.Section key={state.id} title={state.name} subtitle={`${stories.length} stories`}>
                {stories?.map((story) => {
                  return (
                    <StoryListItem
                      story={story}
                      project={projectIdMap[story.project_id!]}
                      key={story.id}
                      mutate={mutate}
                    />
                  );
                })}
              </List.Section>
            );
          });
        })}
    </List>
  );
}
