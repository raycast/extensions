import { useMemberInfo, useAssignedStories } from "./hooks";
import { StorySlim } from "@useshortcut/client";
import StoriesList from "./components/StoriesList";

export default function AssignedStories() {
  const { data: memberInfo } = useMemberInfo();
  const { data: assignedStories, isValidating } = useAssignedStories(memberInfo?.mention_name);

  return <StoriesList isLoading={isValidating} stories={assignedStories?.data as unknown as StorySlim[]} />;
}
