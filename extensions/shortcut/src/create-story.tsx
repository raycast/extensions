import { popToRoot } from "@raycast/api";
import { CreateStoryParams, UpdateStory } from "@useshortcut/client";
import StoryForm, { StoryFormRawValues } from "./components/StoryForm";

export default function CreateStory({ draftValues }: { draftValues: StoryFormRawValues }) {
  const onSubmit = async (story: CreateStoryParams | UpdateStory) => {
    console.log(story);

    // popToRoot();
  };

  return <StoryForm onSubmit={onSubmit} draftValues={draftValues} enableDrafts />;
}
