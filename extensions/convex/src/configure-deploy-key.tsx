/**
 * Configure Deploy Key Command
 *
 * Allows users to configure deploy key authentication for direct deployment access.
 * This provides an alternative to OAuth login for accessing a single deployment.
 */

import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  List,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  buildDeployKeyConfig,
  validateDeployKey,
  saveDeployKeyConfig,
  clearDeployKeyConfig,
  getDeployKeyConfigAsync,
  type DeployKeyConfig,
} from "./lib/deployKeyAuth";

type ViewState = "loading" | "form" | "configured";

export default function ConfigureDeployKeyCommand() {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [currentConfig, setCurrentConfig] = useState<DeployKeyConfig | null>(
    null,
  );
  const [isValidating, setIsValidating] = useState(false);

  // Form state
  const [deployKey, setDeployKey] = useState("");
  const [deploymentUrl, setDeploymentUrl] = useState("");
  const [deployKeyError, setDeployKeyError] = useState<string | undefined>();
  const [deploymentUrlError, setDeploymentUrlError] = useState<
    string | undefined
  >();

  // Load current configuration on mount
  useEffect(() => {
    async function loadConfig() {
      const config = await getDeployKeyConfigAsync();
      if (config) {
        setCurrentConfig(config);
        setViewState("configured");
      } else {
        setViewState("form");
      }
    }
    loadConfig();
  }, []);

  // Validate deploy key format
  const validateDeployKeyFormat = (value: string): string | undefined => {
    if (!value) {
      return "Deploy key is required";
    }
    if (!value.includes("|")) {
      return "Invalid format. Expected: instance-name|key";
    }
    return undefined;
  };

  // Validate deployment URL format
  const validateDeploymentUrlFormat = (value: string): string | undefined => {
    if (!value) {
      return "Deployment URL is required";
    }
    try {
      const url = value.startsWith("http") ? value : `https://${value}`;
      new URL(url);
      return undefined;
    } catch {
      return "Invalid URL format";
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate inputs
    const keyError = validateDeployKeyFormat(deployKey);
    const urlError = validateDeploymentUrlFormat(deploymentUrl);

    setDeployKeyError(keyError);
    setDeploymentUrlError(urlError);

    if (keyError || urlError) {
      return;
    }

    // Build config
    const config = buildDeployKeyConfig(deployKey, deploymentUrl);
    if (!config) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Configuration",
        message: "Could not extract deployment name from URL or key",
      });
      return;
    }

    // Validate credentials
    setIsValidating(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "Validating credentials...",
    });

    const validation = await validateDeployKey(config);
    setIsValidating(false);

    if (!validation.valid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Failed",
        message: validation.error ?? "Invalid deploy key",
      });
      return;
    }

    // Save configuration
    await saveDeployKeyConfig(deployKey, deploymentUrl);
    setCurrentConfig(config);

    await showToast({
      style: Toast.Style.Success,
      title: "Deploy Key Configured",
      message: `Connected to ${config.deploymentName}`,
    });

    setViewState("configured");
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    await clearDeployKeyConfig();
    setCurrentConfig(null);
    setDeployKey("");
    setDeploymentUrl("");

    await showToast({
      style: Toast.Style.Success,
      title: "Deploy Key Removed",
      message: "You can now use OAuth login or configure a new deploy key",
    });

    setViewState("form");
  };

  // Handle edit
  const handleEdit = () => {
    if (currentConfig) {
      setDeployKey(currentConfig.deployKey);
      setDeploymentUrl(currentConfig.deploymentUrl);
    }
    setViewState("form");
  };

  // Loading state
  if (viewState === "loading") {
    return <List isLoading={true} searchBarPlaceholder="Loading..." />;
  }

  // Configured state - show current configuration
  if (viewState === "configured" && currentConfig) {
    return (
      <List>
        <List.Section title="Current Deploy Key Configuration">
          <List.Item
            title={currentConfig.deploymentName}
            subtitle="Connected deployment"
            icon={Icon.CheckCircle}
            accessories={[{ text: "Active", icon: Icon.Lock }]}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Configuration"
                  icon={Icon.Pencil}
                  onAction={handleEdit}
                />
                <Action
                  title="Disconnect"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={handleDisconnect}
                />
                <Action.CopyToClipboard
                  title="Copy Deployment URL"
                  content={currentConfig.deploymentUrl}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>

        <List.Section title="Deployment Details">
          <List.Item
            title="Deployment URL"
            subtitle={currentConfig.deploymentUrl}
            icon={Icon.Link}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={currentConfig.deploymentUrl}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Deploy Key"
            subtitle={`${currentConfig.deployKey.substring(0, 20)}...`}
            icon={Icon.Key}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Deploy Key"
                  content={currentConfig.deployKey}
                />
              </ActionPanel>
            }
          />
        </List.Section>

        <List.Section title="Actions">
          <List.Item
            title="Edit Configuration"
            subtitle="Update deploy key or deployment URL"
            icon={Icon.Pencil}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Configuration"
                  icon={Icon.Pencil}
                  onAction={handleEdit}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Disconnect Deploy Key"
            subtitle="Remove deploy key and use OAuth login instead"
            icon={Icon.XMarkCircle}
            actions={
              <ActionPanel>
                <Action
                  title="Disconnect"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={handleDisconnect}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      </List>
    );
  }

  // Form state - configure new deploy key
  return (
    <Form
      isLoading={isValidating}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Configuration"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          {currentConfig && (
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              onAction={() => setViewState("configured")}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Configure Deploy Key"
        text="Enter your Convex deploy key and deployment URL to authenticate without browser login. You can find these in your Convex Dashboard under Settings."
      />

      <Form.PasswordField
        id="deployKey"
        title="Deploy Key"
        placeholder="instance-name|0a1b2c3d4e5f..."
        info="Get from Dashboard → Settings → Deploy Key"
        value={deployKey}
        onChange={(value) => {
          setDeployKey(value);
          setDeployKeyError(undefined);
        }}
        error={deployKeyError}
      />

      <Form.TextField
        id="deploymentUrl"
        title="Deployment URL"
        placeholder="https://polite-condor-874.convex.cloud"
        info="Your Convex deployment URL"
        value={deploymentUrl}
        onChange={(value) => {
          setDeploymentUrl(value);
          setDeploymentUrlError(undefined);
        }}
        error={deploymentUrlError}
      />

      <Form.Separator />

      <Form.Description
        title="Note"
        text="Deploy key mode locks you to a single deployment. To switch between projects or deployments, you'll need to use OAuth login instead."
      />
    </Form>
  );
}
