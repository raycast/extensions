import { useIterationStories } from "../hooks";
import StoriesList from "./StoriesList";

export function IterationStories({ iterationId }: { iterationId: number }) {
  const { data: stories, isLoading, mutate } = useIterationStories(iterationId);

  return <StoriesList stories={stories} isLoading={isLoading} mutate={mutate} />;
}
