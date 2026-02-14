import { getSelectedText, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { TranslationResult } from "./search-tureng";

export default function Command() {
  const { data: word, isLoading } = usePromise(async () => {
    try {
      const text = await getSelectedText();
      return text.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, " ").trim();
    } catch {
      return "";
    }
  });

  if (isLoading) {
    return <List isLoading />;
  }

  if (!word) {
    return (
      <List>
        <List.EmptyView icon={Icon.Text} title="No text selected" description="Select some text and try again" />
      </List>
    );
  }

  return <TranslationResult word={word} />;
}
