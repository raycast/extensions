import { popToRoot, showToast, Toast } from "@raycast/api";
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
      await shortcut.createStory(values);
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
