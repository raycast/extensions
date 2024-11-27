import { List } from "@raycast/api";
import dedent from "ts-dedent";
import { File } from "../types";

function details(file: File) {
  let header = "";
  if (file.frontmatter) {
    header = dedent`
      \`\`\`
      ---
      ${file.frontmatter}
      ---
      \`\`\`
    `;
  }

  return dedent`
    ${header}
  
    ${file.body ?? ""}
  `;
}

type Props = { file: File; loading: boolean };
export default function FileItemDetail({ file, loading }: Props): JSX.Element {
  return <List.Item.Detail markdown={details(file)} isLoading={loading} />;
}
