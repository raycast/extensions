import { useIterationStories } from "../hooks";
import StoriesList from "./StoriesList";

export function IterationStories({ iterationId }: { iterationId: number }) {
  const { data: stories, isValidating, mutate } = useIterationStories(iterationId);

  return <StoriesList stories={stories} isLoading={isValidating} refreshList={mutate} />;
}
