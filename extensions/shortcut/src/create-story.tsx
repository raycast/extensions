import { popToRoot, showToast, Toast, open } from "@raycast/api";
import { CreateStoryParams, UpdateStory } from "@useshortcut/client";
import StoryForm, { StoryFormRawValues } from "./components/StoryForm";
import shortcut from "./utils/shortcut";

export default function CreateStory({ draftValues }: { draftValues: StoryFormRawValues }) {
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
            open(story.app_url);
          },
        },
      });
      popToRoot();
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
