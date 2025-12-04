import { Detail } from "@raycast/api";

export function ReadingListDetail({ bodyMarkdown }: { bodyMarkdown: string }) {
  return <Detail markdown={bodyMarkdown} />;
}
