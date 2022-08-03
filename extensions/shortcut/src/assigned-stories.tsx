import { useMemberInfo, useAssignedStories } from "./hooks";
import { StorySlim } from "@useshortcut/client";
import StoriesList from "./components/StoriesList";

export default function AssignedStories() {
  const { data: memberInfo } = useMemberInfo();
  const { data: assignedStories, isValidating, mutate } = useAssignedStories(memberInfo?.mention_name);

  return (
    <StoriesList
      isLoading={!assignedStories || isValidating}
      stories={assignedStories?.data as unknown as StorySlim[]}
      mutate={mutate}
    />
  );
}
