import { Action, ActionPanel, Detail } from "@raycast/api";
import { useAppSyncSchema } from "../../hooks/use-appsync";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

export default function AppSyncSchema({ apiId, apiName }: { apiId: string; apiName: string }) {
  const { schema, error, isLoading } = useAppSyncSchema(apiId, "SDL");

  if (error) {
    return <Detail markdown={`# Error\n\n${error.message}`} navigationTitle={`Schema - ${apiName}`} />;
  }

  if (isLoading) {
    return <Detail isLoading={true} navigationTitle={`Schema - ${apiName}`} />;
  }

  // Convert Uint8Array to string if needed
  const schemaString = schema instanceof Uint8Array ? new TextDecoder().decode(schema) : "";

  const markdown = `# GraphQL Schema - ${apiName}

\`\`\`graphql
${schemaString}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Schema - ${apiName}`}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(apiId, "AWS::AppSync::Schema")} />
          <Action.CopyToClipboard title="Copy Schema" content={schemaString} />
          <Action.Paste title="Paste Schema" content={schemaString} />
        </ActionPanel>
      }
    />
  );
}
