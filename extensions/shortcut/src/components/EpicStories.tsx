import { useEpicStories } from "../hooks";
import StoriesList from "./StoriesList";

export default function EpicStories({ epicId }: { epicId: number }) {
  const { data: stories, isLoading, mutate, error } = useEpicStories(epicId);

  return <StoriesList isLoading={isLoading} stories={stories} mutate={mutate} error={error} />;
}
