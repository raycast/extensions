import { Detail, LaunchProps } from "@raycast/api";
import jsonToGo from "json-to-go";

interface Arguments {
  json: string | undefined;
  inline_type_definitions: boolean | undefined;
  omitempty: boolean | undefined;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const transformedValue = jsonToGo(
    props.arguments.json || "",
    "",
    props.arguments.inline_type_definitions || false,
    false,
    props.arguments.omitempty || false,
  ).go;

  const markdown = `
  # RESULTS 🎉

  Here is the transformed JSON to Go struct:

  \`\`\`go
  ${transformedValue}
  \`\`\`

  `;

  return <Detail markdown={markdown} navigationTitle={"Made by RanaRauff"} />;
}
