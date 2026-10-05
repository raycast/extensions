import { List, ActionPanel, Action, showToast, Toast, Icon, Alert, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import { ProxyTemplate } from "./types/template";
import { TemplateManager } from "./utils/template";
import { NetworkUtils } from "./utils/network";
import { CreateTemplateForm } from "./components/CreateTemplateForm";
import { EditTemplateForm } from "./components/EditTemplateForm";
import { showFailureToast } from "@raycast/utils";

export default function ManageProxyTemplates() {
  const [templates, setTemplates] = useState<ProxyTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [service, setService] = useState<string>("");

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const allTemplates = await TemplateManager.getAllAvailableTemplates();
      setTemplates(allTemplates);

      // Get current network service
      const currentService = await NetworkUtils.getPrimaryNetworkService();
      setService(currentService);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load templates" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleApplyTemplate = async (template: ProxyTemplate) => {
    try {
      const settings = template.settings;

      // First disable all proxies
      await NetworkUtils.disableHttpProxy(service);
      await NetworkUtils.disableHttpsProxy(service);
      await NetworkUtils.disableSocksProxy(service);
      await NetworkUtils.disableAutoProxyUrl(service);

      // Then apply the template settings
      if (settings.httpProxy) {
        const { server, port } = parseProxyAddress(settings.httpProxy);
        await NetworkUtils.setHttpProxy(service, server, port);
        await NetworkUtils.enableHttpProxy(service);
      }

      if (settings.httpsProxy) {
        const { server, port } = parseProxyAddress(settings.httpsProxy);
        await NetworkUtils.setHttpsProxy(service, server, port);
        await NetworkUtils.enableHttpsProxy(service);
      }

      if (settings.socksProxy) {
        const { server, port } = parseProxyAddress(settings.socksProxy);
        await NetworkUtils.setSocksProxy(service, server, port);
        await NetworkUtils.enableSocksProxy(service);
      }

      if (settings.autoProxyUrl) {
        await NetworkUtils.setAutoProxyUrl(service, settings.autoProxyUrl);
        await NetworkUtils.enableAutoProxyUrl(service);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Template Applied",
        message: `Proxy configuration "${template.name}" has been applied successfully`,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to apply template" });
    }
  };

  const handleDeleteTemplate = async (template: ProxyTemplate) => {
    if (template.isLastUsed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot delete",
        message: "Last used configuration cannot be deleted",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete Template",
      message: `Are you sure you want to delete the template "${template.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await TemplateManager.deleteTemplate(template.id);
        await loadTemplates();
        await showToast({
          style: Toast.Style.Success,
          title: "Template Deleted",
          message: `Template "${template.name}" has been deleted`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete template",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  };

  const parseProxyAddress = (address: string): { server: string; port: string } => {
    const parts = address.split(":");
    if (parts.length < 2) {
      throw new Error("Invalid proxy address format");
    }

    const server = parts.slice(0, -1).join(":");
    const port = parts[parts.length - 1];

    return { server, port };
  };

  const renderTemplateActions = (template: ProxyTemplate) => {
    const actions = [
      <Action key="apply" title="Apply Template" icon={Icon.Play} onAction={() => handleApplyTemplate(template)} />,
    ];

    if (template.isLastUsed) {
      // Add "Save as Template" action for Last Used Configuration
      actions.push(
        <Action.Push
          key="saveAsTemplate"
          title="Save as Template"
          icon={Icon.Plus}
          target={
            <CreateTemplateForm onSave={loadTemplates} initialSettings={template.settings} isFromLastUsed={true} />
          }
        />,
      );
    } else {
      actions.push(
        <Action.Push
          key="edit"
          title="Edit Template"
          icon={Icon.Pencil}
          target={<EditTemplateForm template={template} onSave={loadTemplates} />}
        />,
      );

      actions.push(
        <Action
          key="delete"
          title="Delete Template"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => handleDeleteTemplate(template)}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        />,
      );
    }

    // Add "Create New Template" as second action (consistent with other pages)
    actions.splice(
      1,
      0,
      <Action.Push
        key="createNew"
        title="Create New Template"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<CreateTemplateForm onSave={loadTemplates} />}
      />,
    );

    actions.push(
      <Action
        key="refresh"
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={loadTemplates}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />,
    );

    return actions;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search proxy templates..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Create New Template"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<CreateTemplateForm onSave={loadTemplates} />}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={loadTemplates}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {templates.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Proxy Templates"
          description="Create your first proxy template to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Template"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateTemplateForm onSave={loadTemplates} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        templates.map((template) => (
          <List.Item
            key={template.id}
            title={template.name}
            subtitle={TemplateManager.formatTemplateDisplay(template)}
            accessories={[
              {
                text: template.isLastUsed ? "Last Used" : "Template",
                tooltip: template.description,
              },
            ]}
            icon={template.isLastUsed ? Icon.Clock : Icon.Document}
            actions={<ActionPanel>{renderTemplateActions(template)}</ActionPanel>}
          />
        ))
      )}
    </List>
  );
}
