import { Detail } from "@raycast/api";

export default function DocsDetail({ markdown }: { markdown: string }) {
  return <Detail markdown={markdown} />;
}
