import { Method } from "@aws-sdk/client-api-gateway";
import { Action, ActionPanel, Detail } from "@raycast/api";
import { useApiGatewayMethod } from "../../hooks/use-apigateway";
import { resourceToConsoleLink } from "../../util";
import { AwsAction } from "../common/action";

export default function ApiGatewayMethodDetail({
  apiId,
  resourceId,
  httpMethod,
  resourcePath,
}: {
  apiId: string;
  resourceId: string;
  httpMethod: string;
  resourcePath: string;
}) {
  const { method, error, isLoading } = useApiGatewayMethod(apiId, resourceId, httpMethod);

  if (error) {
    return <Detail markdown={`# Error\n\n${error.message}`} />;
  }

  if (isLoading || !method) {
    return <Detail isLoading={true} markdown="Loading method details..." />;
  }

  const markdown = generateMethodMarkdown(method, httpMethod, resourcePath);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${httpMethod} ${resourcePath}`}
      actions={
        <ActionPanel>
          <AwsAction.Console
            url={resourceToConsoleLink(
              `${apiId}/resources/${resourceId}/methods/${httpMethod}`,
              "AWS::ApiGateway::Method",
            )}
          />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Resource Path" content={resourcePath} />
            <Action.CopyToClipboard title="Copy HTTP Method" content={httpMethod} />
            {method.methodIntegration?.uri && (
              <Action.CopyToClipboard title="Copy Integration URI" content={method.methodIntegration.uri} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function generateMethodMarkdown(method: Method, httpMethod: string, resourcePath: string): string {
  const integration = method.methodIntegration;
  const authType = method.authorizationType || "NONE";
  const apiKeyRequired = method.apiKeyRequired ? "Yes" : "No";

  let markdown = `# ${httpMethod} ${resourcePath}\n\n`;

  // Authorization Section
  markdown += `## Authorization\n\n`;
  markdown += `- **Type:** ${authType}\n`;
  markdown += `- **API Key Required:** ${apiKeyRequired}\n`;
  if (method.authorizerId) {
    markdown += `- **Authorizer ID:** ${method.authorizerId}\n`;
  }
  if (method.authorizationScopes?.length) {
    markdown += `- **Scopes:** ${method.authorizationScopes.join(", ")}\n`;
  }
  markdown += "\n";

  // Integration Section
  if (integration) {
    markdown += `## Integration\n\n`;
    markdown += `- **Type:** ${integration.type || "N/A"}\n`;
    markdown += `- **HTTP Method:** ${integration.httpMethod || "N/A"}\n`;
    if (integration.uri) {
      markdown += `- **URI:** \`${integration.uri}\`\n`;
    }
    if (integration.connectionType) {
      markdown += `- **Connection Type:** ${integration.connectionType}\n`;
    }
    if (integration.credentials) {
      markdown += `- **Credentials:** ${integration.credentials}\n`;
    }
    markdown += "\n";

    // Request Parameters
    if (integration.requestParameters && Object.keys(integration.requestParameters).length > 0) {
      markdown += `### Request Parameters\n\n`;
      for (const [key, value] of Object.entries(integration.requestParameters)) {
        markdown += `- \`${key}\`: ${value}\n`;
      }
      markdown += "\n";
    }

    // Request Templates
    if (integration.requestTemplates && Object.keys(integration.requestTemplates).length > 0) {
      markdown += `### Request Templates\n\n`;
      for (const [contentType, template] of Object.entries(integration.requestTemplates)) {
        markdown += `**${contentType}:**\n`;
        markdown += "```json\n";
        markdown += template;
        markdown += "\n```\n\n";
      }
    }

    // Integration Responses
    if (integration.integrationResponses && Object.keys(integration.integrationResponses).length > 0) {
      markdown += `### Integration Responses\n\n`;
      for (const [statusCode, response] of Object.entries(integration.integrationResponses)) {
        markdown += `**Status ${statusCode}:**\n`;
        if (response.responseTemplates && Object.keys(response.responseTemplates).length > 0) {
          for (const [contentType, template] of Object.entries(response.responseTemplates)) {
            markdown += `- Content-Type: ${contentType}\n`;
            if (template && template.length > 0) {
              markdown += "```json\n";
              markdown += template;
              markdown += "\n```\n";
            }
          }
        }
        if (response.responseParameters && Object.keys(response.responseParameters).length > 0) {
          markdown += "Response Parameters:\n";
          for (const [key, value] of Object.entries(response.responseParameters)) {
            markdown += `- \`${key}\`: ${value}\n`;
          }
        }
        markdown += "\n";
      }
    }
  }

  // Method Responses
  if (method.methodResponses && Object.keys(method.methodResponses).length > 0) {
    markdown += `## Method Responses\n\n`;
    for (const [statusCode, response] of Object.entries(method.methodResponses)) {
      markdown += `### Status ${statusCode}\n`;
      if (response.responseModels && Object.keys(response.responseModels).length > 0) {
        markdown += "**Response Models:**\n";
        for (const [contentType, model] of Object.entries(response.responseModels)) {
          markdown += `- ${contentType}: ${model}\n`;
        }
      }
      if (response.responseParameters && Object.keys(response.responseParameters).length > 0) {
        markdown += "**Response Parameters:**\n";
        for (const [param, required] of Object.entries(response.responseParameters)) {
          markdown += `- ${param}: ${required ? "Required" : "Optional"}\n`;
        }
      }
      markdown += "\n";
    }
  }

  // Request Validation
  if (method.requestValidatorId || method.requestModels || method.requestParameters) {
    markdown += `## Request Validation\n\n`;
    if (method.requestValidatorId) {
      markdown += `- **Validator ID:** ${method.requestValidatorId}\n`;
    }
    if (method.requestModels && Object.keys(method.requestModels).length > 0) {
      markdown += "**Request Models:**\n";
      for (const [contentType, model] of Object.entries(method.requestModels)) {
        markdown += `- ${contentType}: ${model}\n`;
      }
    }
    if (method.requestParameters && Object.keys(method.requestParameters).length > 0) {
      markdown += "**Request Parameters:**\n";
      for (const [param, required] of Object.entries(method.requestParameters)) {
        markdown += `- ${param}: ${required ? "Required" : "Optional"}\n`;
      }
    }
  }

  return markdown;
}
