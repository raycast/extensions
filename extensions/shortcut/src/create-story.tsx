import { CreateStoryParams, UpdateStory } from "@useshortcut/client";
import StoryForm from "./components/StoryForm";

export default function CreateStory() {
  const onSubmit = async (story: CreateStoryParams | UpdateStory) => {
    console.log(story);
  };

  return <StoryForm onSubmit={onSubmit} />;
}
