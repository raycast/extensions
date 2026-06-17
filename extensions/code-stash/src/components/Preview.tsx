import { List } from "@raycast/api";
import { CodeStash } from "../types";

function ViewAction(prop: { codeStash: CodeStash }) {
  const { title, code, language } = prop.codeStash;

  const formattedCode = "```" + language + "\n" + code + "\n```";
  const lineCount = code.split("\n").length;

  return (
    <List.Item.Detail
      markdown={formattedCode}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={title} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Language" text={language} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Length" text={`${lineCount} line${lineCount > 1 ? "s" : ""}`} />
          <List.Item.Detail.Metadata.Separator />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default ViewAction;
