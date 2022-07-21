import { useEpicStories } from "../hooks";
import StoriesList from "./StoriesList";

export default function EpicStories({ epicId }: { epicId: number }) {
  const { data: stories, isValidating } = useEpicStories(epicId);

  return <StoriesList isLoading={isValidating} stories={stories} />;
}
