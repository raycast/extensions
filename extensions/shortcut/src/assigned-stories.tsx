import { useMemberInfo, useAssignedStories } from "./hooks";
import { StorySlim } from "@useshortcut/client";
import StoriesList from "./components/StoriesList";

export default function AssignedStories() {
  const { data: memberInfo } = useMemberInfo();
  const { data: assignedStories, isLoading, mutate, error } = useAssignedStories(memberInfo?.mention_name);

  return (
    <StoriesList
      isLoading={!assignedStories || isLoading}
      error={error}
      stories={assignedStories?.data as unknown as StorySlim[]}
      mutate={mutate}
    />
  );
}
