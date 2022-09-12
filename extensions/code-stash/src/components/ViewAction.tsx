import { Action, Detail, Icon } from "@raycast/api";
import { CodeStash } from "../types";

function ViewAction(prop: { codeStash: CodeStash }) {
  const { title, code, language } = prop.codeStash;

  const formattedCode = "```" + language + "\n" + code + "\n```";
  const lineCount = code.split("\n").length;

  return (
    <Action.Push
      icon={Icon.ArrowRight}
      title="Show"
      target={
        <Detail
          navigationTitle={title}
          markdown={formattedCode}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label title="Title" text={title} />
              <Detail.Metadata.Label title="Language" text={language} />
              <Detail.Metadata.Label title="Length" text={`${lineCount} line${lineCount > 1 ? "s" : ""}`} />
            </Detail.Metadata>
          }
        />
      }
    />
  );
}

export default ViewAction;
