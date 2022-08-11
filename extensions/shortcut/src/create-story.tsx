import { popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { CreateStoryParams, UpdateStory } from "@useshortcut/client";
import StoryForm, { StoryFormRawValues } from "./components/StoryForm";
import shortcut from "./utils/shortcut";
import StoryDetail from "./components/StoryDetail";

export default function CreateStory({ draftValues }: { draftValues: StoryFormRawValues }) {
  const { push } = useNavigation();
  const onSubmit = async (story: CreateStoryParams | UpdateStory) => {
    const values = Object.entries(story).reduce((acc, [key, value]) => {
      return value === null
        ? {
            ...acc,
          }
        : {
            ...acc,
            [key]: value,
          };
    }, {} as CreateStoryParams);

    try {
      const { data: story } = await shortcut.createStory(values);
      showToast({
        title: `Story #${story.id} created`,
        style: Toast.Style.Success,
        primaryAction: {
          title: "View Story",
          onAction: () => {
            push(<StoryDetail storyId={story.id} />);
          },
        },
        secondaryAction: {
          title: "Close",
          onAction: () => {
            popToRoot();
          },
        },
      });
    } catch (error) {
      showToast({
        title: "Could not create story",
        message: String(error),
        style: Toast.Style.Failure,
      });
    }
  };

  return <StoryForm onSubmit={onSubmit} draftValues={draftValues} enableDrafts />;
}
