import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getLectures } from "@/data/lectures";
import { LectureOptionList } from "./components/lecture/lecture-options";

export default function Lectures() {
  const { data: lectures, isLoading } = useCachedPromise(getLectures);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Lectures...">
      {lectures?.map((lecture) => (
        <List.Item
          key={lecture.id}
          icon={Icon.Book}
          title={lecture.lecture_name}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<LectureOptionList lecture={lecture} />} />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        icon={Icon.Book}
        title="No Lectures Found"
        description="You don't have any active lectures at the moment."
      />
    </List>
  );
}
