import { List, Icon } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { getDailyWord } from "./api/rae";
import { WordEntryFC } from "./components/WordEntry";

export default function Command() {
  const { data: wordEntry, isLoading, error } = usePromise(getDailyWord);

  if (error) {
    showFailureToast(error, { title: "Could not load word of the day" });
  }

  return (
    <List isLoading={isLoading}>
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Couldn't load word of the day" description={error.message} />
      ) : wordEntry ? (
        <WordEntryFC wordEntry={wordEntry} />
      ) : null}
    </List>
  );
}
