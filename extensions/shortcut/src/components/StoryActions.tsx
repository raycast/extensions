import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
} from "@raycast/api";
import { Story, StorySlim } from "@useshortcut/client";
import { getMemberName, getStoryColor } from "../helpers/storyHelpers";
import { useGroups, useIterations, useLabelsMap, useMemberInfo, useMemberMap, useStoryWorkflow } from "../hooks";

import shortcut from "../utils/shortcut";
import StoryForm from "./StoryForm";

export default function StoryActions({ story, mutate }: { story?: Story | StorySlim; mutate: () => void }) {
  const { data: memberInfo } = useMemberInfo();
  const { data: iterations } = useIterations();
  const memberMap = useMemberMap();
  const labelsMap = useLabelsMap();
  const { pop } = useNavigation();
  const workflow = useStoryWorkflow(story);
  const { data: teams } = useGroups();

  const storyUpdateAction = (updater: () => Promise<any>) => async () => {
    try {
      await updater();
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
    <>
      {story && (
        <>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Story on Shortcut" url={story?.app_url} icon="command-icon.png" />

            <Action.Push
              title="Edit Story"
              target={
                <StoryForm
                  submitTitle="Update Story"
                  story={story}
                  onSubmit={async (values) => {
                    await storyUpdateAction(async () => shortcut.updateStory(story.id, values))();
                    pop();
                  }}
                />
              }
              icon={Icon.Pencil}
            />
          </ActionPanel.Section>

          <ActionPanel.Submenu
            title="Set Team..."
            icon={Icon.PersonCircle}
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: "t",
            }}
          >
            {story.group_id && (
              <Action
                title="None"
                onAction={storyUpdateAction(() => shortcut.updateStory(story.id, { group_id: null }))}
                icon={Icon.XMarkCircleFilled}
              />
            )}

            {teams
              ?.filter((team) => team.id !== story.group_id)
              .map((team) => (
                <Action
                  key={team.id}
                  title={team.name}
                  onAction={storyUpdateAction(() =>
                    shortcut.updateStory(story.id, {
                      group_id: team.id,
                    })
                  )}
                  icon={{
                    source: Icon.TwoPeople,
                    tintColor: team.color,
                  }}
                />
              ))}
          </ActionPanel.Submenu>

          <ActionPanel.Submenu
            title="Set Status..."
            icon={Icon.Pencil}
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: "s",
            }}
          >
            {workflow?.states.map((state) => {
              return (
                <Action
                  title={state.name}
                  onAction={storyUpdateAction(() => shortcut.updateStory(story.id, { workflow_state_id: state.id }))}
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
              modifiers: ["cmd", "shift", "opt"],
              key: "t",
            }}
          >
            {["bug", "chore", "feature"].map((type) => {
              return (
                <Action
                  title={type}
                  onAction={storyUpdateAction(() =>
                    shortcut.updateStory(story.id, { story_type: type as "bug" | "chore" | "feature" })
                  )}
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
                return (
                  <Action
                    title={`${estimate}`}
                    onAction={storyUpdateAction(() => shortcut.updateStory(story.id, { estimate: estimate }))}
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
                return (
                  <Action
                    title={iteration.name}
                    onAction={storyUpdateAction(() => shortcut.updateStory(story.id, { iteration_id: iteration.id }))}
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

                return (
                  <Action
                    title={getMemberName(member)}
                    onAction={storyUpdateAction(() => shortcut.updateStory(story.id, { owner_ids: newOwnerIds }))}
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

                return (
                  <Action
                    title={label.name}
                    onAction={storyUpdateAction(() =>
                      shortcut.updateStory(story.id, {
                        labels: newLabelIds.map((id) => {
                          const label = labelsMap[id];

                          return {
                            name: label.name,
                          };
                        }),
                      })
                    )}
                    key={label.id}
                    icon={existingLabelIds.includes(label.id) ? Icon.CircleFilled : Icon.Circle}
                  />
                );
              })}
            </ActionPanel.Submenu>
          )}

          <ActionPanel.Section>
            <Action
              title="Copy Story URL"
              icon={Icon.Clipboard}
              onAction={() =>
                Clipboard.copy(story?.app_url).then(() => showToast(Toast.Style.Success, "URL copied to clipboard!"))
              }
              shortcut={{
                modifiers: ["cmd"],
                key: ".",
              }}
            />
            <Action
              title="Copy Story Name"
              icon={Icon.Clipboard}
              onAction={() =>
                Clipboard.copy(story?.name).then(() => showToast(Toast.Style.Success, "Name copied to clipboard!"))
              }
              shortcut={{
                modifiers: ["cmd", "shift"],
                key: ".",
              }}
            />
            <Action
              title="Copy Story ID"
              icon={Icon.Clipboard}
              onAction={() =>
                Clipboard.copy(story?.id.toString()).then(() =>
                  showToast(Toast.Style.Success, "ID copied to clipboard!")
                )
              }
              shortcut={{
                modifiers: ["cmd", "shift"],
                key: ",",
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              style={Action.Style.Destructive}
              title="Delete Story"
              icon={Icon.Trash}
              shortcut={{
                modifiers: ["cmd", "shift"],
                key: "backspace",
              }}
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
    </>
  );
}
