import { Detail, ActionPanel, Action, Icon, useNavigation, popToRoot } from "@raycast/api";
import { KubernetesContext } from "../types";
import { useKubeconfig } from "../hooks/useKubeconfig";
import { showSuccessToast, showErrorToast } from "../utils/errors";

interface ContextDetailsProps {
  context: KubernetesContext;
}

export function ContextDetails({ context }: ContextDetailsProps) {
  const { pop } = useNavigation();
  const { switchContext } = useKubeconfig();

  const handleSwitchContext = async (contextName: string) => {
    try {
      const success = await switchContext(contextName);
      if (success) {
        await showSuccessToast("Context Switched", `Switched to: ${contextName}`);
        // Go back to Raycast main command list
        await popToRoot();
      }
    } catch (err) {
      await showErrorToast(err as Error);
    }
  };

  const generateMarkdown = () => {
    return `
# Context Details: **${context.name}**

${context.current ? "## ✅ **CURRENT ACTIVE CONTEXT**" : "## 📋 Context Information"}

### Basic Information
- **Name**: ${context.name}
- **Cluster**: ${context.cluster}
- **User**: ${context.user}
- **Namespace**: ${context.namespace || "default"}
- **Status**: ${context.current ? "🟢 Active" : "⚪ Inactive"}

### Authentication
- **Authentication Method**: ${context.userAuthMethod || "Unknown"}

${
  context.clusterDetails
    ? `
### Cluster Details
- **Server**: ${context.clusterDetails.server || "Not specified"}
- **Hostname**: ${context.clusterDetails.hostname}
- **Port**: ${context.clusterDetails.port}
- **Protocol**: ${context.clusterDetails.protocol}
- **Security**: ${context.clusterDetails.isSecure ? "🔒 Secure (TLS Enabled)" : "⚠️ Insecure (TLS Disabled)"}
- **CA Certificate**: ${context.clusterDetails.hasCA ? "✅ Present" : "❌ Missing"}

### Connection Information
- **Connection Security**: ${context.clusterDetails.isSecure ? "Encrypted with TLS" : "Unencrypted connection"}
- **Certificate Authority**: ${context.clusterDetails.hasCA ? "CA certificate configured for validation" : "No CA certificate - may skip TLS verification"}
`
    : `
### Cluster Details
*Cluster information not available - cluster may not be properly configured*
`
}

### Usage
${
  context.current
    ? `
This is your **current active context**. All kubectl commands will be executed against this context.

To switch to a different context, use the "List Contexts" command and select another context.
`
    : `
This context is **not currently active**. 

To switch to this context:
1. Use the "Switch to ${context.name}" action below
2. Or use the "List Contexts" command to switch between contexts
`
}

### Quick Actions
Use the actions below to manage this context.
    `;
  };

  return (
    <Detail
      markdown={generateMarkdown()}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Context Name" text={context.name} />
          <Detail.Metadata.Label
            title="Status"
            text={context.current ? "Active" : "Inactive"}
            icon={context.current ? Icon.CheckCircle : Icon.Circle}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Cluster" text={context.cluster} />
          <Detail.Metadata.Label title="User" text={context.user} />
          <Detail.Metadata.Label title="Namespace" text={context.namespace || "default"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Authentication" text={context.userAuthMethod || "Unknown"} />
          {context.clusterDetails && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Server" text={context.clusterDetails.server || "Not configured"} />
              <Detail.Metadata.Label title="Hostname" text={context.clusterDetails.hostname} />
              <Detail.Metadata.Label title="Port" text={context.clusterDetails.port} />
              <Detail.Metadata.Label title="Protocol" text={context.clusterDetails.protocol} />
              <Detail.Metadata.Label
                title="Security"
                text={context.clusterDetails.isSecure ? "Secure" : "Insecure"}
                icon={context.clusterDetails.isSecure ? Icon.Lock : Icon.ExclamationMark}
              />
              <Detail.Metadata.Label
                title="CA Certificate"
                text={context.clusterDetails.hasCA ? "Present" : "Missing"}
                icon={context.clusterDetails.hasCA ? Icon.CheckCircle : Icon.XMarkCircle}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Back to Contexts List" icon={Icon.ArrowLeft} onAction={() => pop()} />
          {!context.current && (
            <Action
              title={`Switch to ${context.name}`}
              icon={Icon.ArrowRight}
              onAction={() => handleSwitchContext(context.name)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
