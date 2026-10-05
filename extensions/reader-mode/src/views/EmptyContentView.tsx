import { Detail } from "@raycast/api";
import { EmptyContentActions } from "../actions/EmptyContentActions";

interface EmptyContentViewProps {
  url: string;
}

function buildEmptyContentMarkdown(): string {
  return `# Nothing to Read!

Well, we looked, but couldn't find any readable content at this URL.

The page may be:
- Mostly navigation or UI elements
- Behind a login wall
- Dynamically loaded with JavaScript
- Not designed for reading

You can try opening it in your browser instead by hitting enter.`;
}

export function EmptyContentView({ url }: EmptyContentViewProps) {
  const markdown = buildEmptyContentMarkdown();

  return (
    <Detail markdown={markdown} navigationTitle={"Nothing to Read!"} actions={<EmptyContentActions url={url} />} />
  );
}
