import { Detail } from "@raycast/api";

type MarkdownDetailViewProps = {
  title: string;
  markdown: string;
};

export function MarkdownDetailView(props: MarkdownDetailViewProps) {
  return <Detail navigationTitle={props.title} markdown={props.markdown} />;
}
