import { ActionPanel, Action, Detail } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type BibleApiVerse = {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
};

type BibleAPIResult = {
  reference: string;
  text: string;
  translation_name: string;
  verses: BibleApiVerse[];
};

export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const reference = props.arguments.reference;
  const api_url = `https://bible-api.com/${reference}`;
  const { isLoading, data, error } = useFetch(api_url);

  let content = "";
  let copy_content = "";
  let url = "";
  if (data) {
    const d = data as unknown as BibleAPIResult;
    for (const v of d.verses) {
      content += ` *${v.verse}* ${v.text}`;
    }
    content += `\n\n-${d.reference}, ${d.translation_name}`;
    copy_content = `"${d.text.replaceAll("\n", " ").trim()}" -${d.reference}, ${d.translation_name}`;
    const book_id = d.verses[0].book_id;
    const chapter = d.verses[0].chapter;
    url = `https://bible.com/bible/59/${book_id}.${chapter}`;
  } else if (error) {
    content = error.message;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={content}
      actions={
        <ActionPanel title="Use this verse">
          <Action.CopyToClipboard title="Copy Verses" content={copy_content} />
          <Action.OpenInBrowser url={url} />
        </ActionPanel>
      }
    />
  );
}
