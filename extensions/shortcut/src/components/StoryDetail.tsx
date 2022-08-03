import { useMemo } from "react";
import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { getMemberAvatar, getMemberName, getStoryColor } from "../helpers/storyHelpers";
import { Story } from "@useshortcut/client";
import {
  useGroupsMap,
  useIterationMap,
  useIterations,
  useLabelsMap,
  useMemberInfo,
  useMemberMap,
  useProject,
  useStory,
  useWorkflowMap,
} from "../hooks";
import shortcut from "../utils/shortcut";
import { capitalize } from "../utils/string";

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

export default function StoryDetail({ storyId, mutate }: { storyId: number; mutate?: () => void }) {
  const { data: story, isLoading, mutate: mutateStory } = useStory(storyId);
  const workflowMap = useWorkflowMap();
  const storyMarkdown = useStoryMarkdown(story);
  const groupMap = useGroupsMap();
  const { data: project } = useProject(story?.project_id as number);
  const iterationMap = useIterationMap();
  const { data: iterations } = useIterations();
  const memberMap = useMemberMap();
  const { data: memberInfo } = useMemberInfo();
  const labelsMap = useLabelsMap();
  const { pop } = useNavigation();

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
      isLoading={isLoading}
      navigationTitle={story?.name}
      markdown={storyMarkdown}
      actions={
        <ActionPanel title="Story Actions">
          {story && (
            <>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open story on Shortcut" url={story?.app_url} icon="command-icon.png" />
              </ActionPanel.Section>

              <ActionPanel.Submenu
                title="Set Status..."
                icon={Icon.Pencil}
                shortcut={{
                  modifiers: ["cmd", "shift"],
                  key: "s",
                }}
              >
                {workflow?.states.map((state) => {
                  const onAction = async () => {
                    try {
                      await shortcut.updateStory(story.id, { workflow_state_id: state.id });
                      await mutateStory();
                      if (mutate) {
                        mutate();
                      }
                    } catch (error) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to update story",
                        message: String(error),
                      });
                    }
                  };

                  return (
                    <Action
                      title={state.name}
                      onAction={onAction}
                      key={state.id}
                      icon={state.id !== story.workflow_state_id ? Icon.Circle : Icon.CircleFilled}
                    />
                  );
                })}
              </ActionPanel.Submenu>

              <ActionPanel.Submenu
                title="Set Type..."
                icon={Icon.Bookmark}
                shortcut={{
                  modifiers: ["cmd", "shift"],
                  key: "t",
                }}
              >
                {["bug", "chore", "feature"].map((type) => {
                  const onAction = async () => {
                    try {
                      await shortcut.updateStory(story.id, { story_type: type as "bug" | "chore" | "feature" });
                      await mutateStory();
                      if (mutate) {
                        mutate();
                      }
                    } catch (error) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to update story",
                        message: String(error),
                      });
                    }
                  };

                  return (
                    <Action
                      title={type}
                      onAction={onAction}
                      key={type}
                      icon={{
                        source: type !== story.story_type ? Icon.Circle : Icon.CircleFilled,
                        tintColor: getStoryColor(type),
                      }}
                    />
                  );
                })}
              </ActionPanel.Submenu>

              {memberInfo && memberInfo.workspace2.estimate_scale && (
                <ActionPanel.Submenu
                  title="Set Estimate..."
                  icon={Icon.Clock}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "e",
                  }}
                >
                  {memberInfo.workspace2.estimate_scale.map((estimate) => {
                    const onAction = async () => {
                      try {
                        await shortcut.updateStory(story.id, { estimate: estimate });
                        await mutateStory();
                        if (mutate) {
                          mutate();
                        }
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to update story",
                          message: String(error),
                        });
                      }
                    };

                    return (
                      <Action
                        title={`${estimate}`}
                        onAction={onAction}
                        key={estimate}
                        icon={estimate !== story.estimate ? Icon.Circle : Icon.CircleFilled}
                      />
                    );
                  })}
                </ActionPanel.Submenu>
              )}

              {iterations && (
                <ActionPanel.Submenu
                  title="Set Iteration..."
                  icon={Icon.Repeat}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "i",
                  }}
                >
                  {iterations.map((iteration) => {
                    const onAction = async () => {
                      try {
                        await shortcut.updateStory(story.id, { iteration_id: iteration.id });
                        await mutateStory();
                        if (mutate) {
                          mutate();
                        }
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to update story",
                          message: String(error),
                        });
                      }
                    };

                    return (
                      <Action
                        title={iteration.name}
                        onAction={onAction}
                        key={iteration.id}
                        icon={iteration.id !== story.iteration_id ? Icon.Circle : Icon.CircleFilled}
                      />
                    );
                  })}
                </ActionPanel.Submenu>
              )}

              {memberMap && Object.entries(memberMap).length > 0 && (
                <ActionPanel.Submenu
                  title="Assign Owner..."
                  icon={Icon.PersonCircle}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "o",
                  }}
                >
                  {Object.entries(memberMap).map(([memberId, member]) => {
                    const existingOwnerIds = story.owner_ids || [];
                    const newOwnerIds = existingOwnerIds.includes(memberId)
                      ? existingOwnerIds.filter((id) => id !== memberId)
                      : [...existingOwnerIds, memberId];

                    const onAction = async () => {
                      try {
                        await shortcut.updateStory(story.id, { owner_ids: newOwnerIds });
                        await mutateStory();
                        if (mutate) {
                          mutate();
                        }
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to update story",
                          message: String(error),
                        });
                      }
                    };

                    return (
                      <Action
                        title={getMemberName(member)}
                        onAction={onAction}
                        key={memberId}
                        icon={existingOwnerIds.includes(memberId) ? Icon.CircleFilled : Icon.Circle}
                      />
                    );
                  })}
                </ActionPanel.Submenu>
              )}

              {labelsMap && Object.keys(labelsMap).length > 0 && (
                <ActionPanel.Submenu
                  title="Assign Label..."
                  icon={Icon.Tag}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "l",
                  }}
                >
                  {Object.entries(labelsMap).map(([labelId, label]) => {
                    const existingLabelIds = story.label_ids || [];
                    const newLabelIds = existingLabelIds.includes(label.id)
                      ? existingLabelIds.filter((id) => id !== label.id)
                      : [...existingLabelIds, label.id];

                    const onAction = async () => {
                      try {
                        await shortcut.updateStory(story.id, {
                          labels: newLabelIds.map((id) => {
                            const label = labelsMap[id];

                            return {
                              name: label.name,
                            };
                          }),
                        });
                        await mutateStory();
                        if (mutate) {
                          mutate();
                        }
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to update story",
                          message: String(error),
                        });
                      }
                    };

                    return (
                      <Action
                        title={label.name}
                        onAction={onAction}
                        key={label.id}
                        icon={existingLabelIds.includes(label.id) ? Icon.CircleFilled : Icon.Circle}
                      />
                    );
                  })}
                </ActionPanel.Submenu>
              )}

              <ActionPanel.Section>
                <Action
                  style={Action.Style.Destructive}
                  title="Delete Story"
                  icon={Icon.Trash}
                  onAction={() => {
                    confirmAlert({
                      title: "Delete Story",
                      message: "Are you sure you want to delete this story?",
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                        onAction: async () => {
                          try {
                            await shortcut.deleteStory(story.id);

                            if (mutate) {
                              mutate();
                            }

                            pop();
                          } catch (error) {
                            showToast({
                              style: Toast.Style.Failure,
                              title: "Failed to delete story",
                              message: String(error),
                            });
                          }
                        },
                      },
                    });
                  }}
                />
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
      metadata={
        story && (
          <Detail.Metadata>
            <Detail.Metadata.Link target={story.app_url} title="Open Story URL" text="Link" />

            {storyTeam && <Detail.Metadata.Label title="Team" text={storyTeam.name} />}

            {storyState && <Detail.Metadata.Label title="Status" text={storyState.name} />}

            {story.labels.length > 0 && (
              <Detail.Metadata.TagList title="Labels">
                {story.labels.map((label) => (
                  <Detail.Metadata.TagList.Item text={label.name} color={label.color} key={label.id} />
                ))}
              </Detail.Metadata.TagList>
            )}

            {project && <Detail.Metadata.Label title="Project" text={project.name} />}

            <Detail.Metadata.Separator />

            {storyIteration && <Detail.Metadata.Label title="Iteration" text={storyIteration.name} />}

            {story.story_type && (
              <Detail.Metadata.TagList title="Type">
                <Detail.Metadata.TagList.Item
                  text={capitalize(story.story_type)}
                  color={getStoryColor(story.story_type)}
                />
              </Detail.Metadata.TagList>
            )}

            <Detail.Metadata.Separator />

            {requester && (
              <Detail.Metadata.TagList title="Requester">
                <Detail.Metadata.TagList.Item text={requester?.profile.name || ""} icon={getMemberAvatar(requester)} />
              </Detail.Metadata.TagList>
            )}

            {owners && (
              <Detail.Metadata.TagList title="Owners">
                {owners?.map((owner) => {
                  return (
                    <Detail.Metadata.TagList.Item
                      key={owner.id}
                      text={owner?.profile?.name || ""}
                      icon={getMemberAvatar(owner)}
                    />
                  );
                })}

                {owners?.length === 0 && <Detail.Metadata.TagList.Item text="No owners" />}
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

---

${storyTasksMarkdown(story)}
${storyCommentsMarkdown(story)}
  `;
  }

  const storyMarkdown = useMemo(() => {
    return generateStoryMarkdown(story);
  }, [story, memberMap]);

  return storyMarkdown;
}
