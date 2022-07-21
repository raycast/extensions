import { useMemo } from "react";
import { Detail } from "@raycast/api";
import { Story } from "@useshortcut/client";
import { useGroupsMap, useIterationMap, useMemberMap, useProject, useStory, useWorkflowMap } from "../hooks";

const storyTasksMarkdown = (story: Story) => {
  if (story.tasks.length === 0) {
    return "";
  }

  const tasklist = story.tasks
    .map((task) => {
      const checkboxFiller = task.complete ? "x" : " ";

      return `- [${checkboxFiller}] ${task.description}`;
    })
    .join("\n");

  return `### Tasks

${tasklist}
`;
};

export default function StoryDetail({ storyId }: { storyId: number }) {
  const { data: story, isValidating } = useStory(storyId);
  const workflowMap = useWorkflowMap();
  const storyMarkdown = useStoryMarkdown(story);
  const groupMap = useGroupsMap();
  const { data: project } = useProject(story?.project_id as number);
  const iterationMap = useIterationMap();
  const memberMap = useMemberMap();

  const workflow = useMemo(() => {
    if (!story || !workflowMap) {
      return;
    }

    return workflowMap[story.workflow_id];
  }, [story, workflowMap]);

  const storyState = useMemo(() => {
    if (!workflow || !story) {
      return;
    }

    return workflow.states.find((state) => state.id === story.workflow_state_id);
  }, [workflow, story]);

  const storyTeam = useMemo(() => {
    if (!groupMap || !story?.group_id) {
      return;
    }

    return groupMap[parseInt(story.group_id, 10)];
  }, [story, groupMap]);

  const storyIteration = useMemo(() => {
    if (!iterationMap || !story?.iteration_id) {
      return;
    }

    return iterationMap[story.iteration_id];
  }, [story, iterationMap]);

  const requester = useMemo(() => {
    if (!memberMap || !story) {
      return;
    }

    return memberMap[story.requested_by_id];
  }, [story]);

  const owners = useMemo(() => {
    if (!memberMap || !story) {
      return;
    }

    return story.owner_ids.map((ownerId) => memberMap[ownerId]);
  }, [story]);

  return (
    <Detail
      isLoading={isValidating}
      navigationTitle={story?.name}
      markdown={storyMarkdown}
      metadata={
        story && (
          <Detail.Metadata>
            <Detail.Metadata.Link target={story.app_url} title="Open Story URL" text="Link" />

            {storyTeam && <Detail.Metadata.Label title="Team" text={storyTeam.name} />}

            {storyState && <Detail.Metadata.Label title="Status" text={storyState.name} />}

            {story.labels.map((label) => {
              return (
                <Detail.Metadata.TagList title="Labels" key={label.id}>
                  <Detail.Metadata.TagList.Item text={label.name} color={label.color} />
                </Detail.Metadata.TagList>
              );
            })}

            {project && <Detail.Metadata.Label title="Project" text={project.name} />}

            <Detail.Metadata.Separator />

            {storyIteration && <Detail.Metadata.Label title="Iteration" text={storyIteration.name} />}

            {story.story_type && <Detail.Metadata.Label title="Type" text={story.story_type} />}

            <Detail.Metadata.Separator />

            {requester && (
              <Detail.Metadata.TagList title="Requester">
                <Detail.Metadata.TagList.Item
                  text={requester?.profile.name || ""}
                  icon={{
                    source: `https://www.gravatar.com/avatar/${requester?.profile?.gravatar_hash}`,
                  }}
                />
              </Detail.Metadata.TagList>
            )}

            {owners && (
              <Detail.Metadata.TagList title="Owners">
                {owners?.map((owner) => {
                  return (
                    <Detail.Metadata.TagList.Item
                      key={owner.id}
                      text={owner?.profile?.name || ""}
                      icon={{
                        source: `https://www.gravatar.com/avatar/${owner?.profile?.gravatar_hash}`,
                      }}
                    />
                  );
                })}
              </Detail.Metadata.TagList>
            )}

            {(story.estimate || story.deadline) && <Detail.Metadata.Separator />}

            {story.estimate && <Detail.Metadata.Label title="Estimate" text={String(story.estimate)} />}

            {story.deadline && (
              <Detail.Metadata.Label title="Deadline" text={new Date(story.deadline).toLocaleString()} />
            )}
          </Detail.Metadata>
        )
      }
    />
  );
}

function useStoryMarkdown(story?: Story) {
  const memberMap = useMemberMap();

  const storyCommentsMarkdown = (story: Story) => {
    if (story.comments.length === 0) {
      return "";
    }

    const comments = story.comments
      .map((comment) => {
        const author = memberMap?.[comment.author_id!];
        const commentLines = comment.text.split("\n");

        const commentText = commentLines
          .map((line) => {
            if (line.length === 0) {
              return `>    `;
            } else {
              return `> ${line}`;
            }
          })
          .join("\n");

        const createdAt = new Date(comment.created_at);
        const createdText = createdAt.toLocaleString();

        return `> ${author?.profile?.name} - ${createdText} \\
${commentText}
>

---

`;
      })
      .join("\n");

    return `### Comments

${comments}
`;
  };

  function generateStoryMarkdown(story?: Story) {
    if (!story) {
      return "";
    }

    return `# ${story.name}
  
${story.description}
${storyTasksMarkdown(story)}
${storyCommentsMarkdown(story)}
  `;
  }

  const storyMarkdown = useMemo(() => {
    return generateStoryMarkdown(story);
  }, [story, memberMap]);

  return storyMarkdown;
}
