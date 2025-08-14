import { List, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { ProxyTemplate } from "../types/template";
import { TemplateManager } from "../utils/template";
import { NetworkUtils } from "../utils/network";
import { ProxyUtils } from "../utils/proxy";
import { CreateTemplateForm } from "./CreateTemplateForm";
import { showFailureToast } from "@raycast/utils";

interface TemplateSelectionProps {
  service: string;
  onTemplateApplied: () => void;
  mode?: "select" | "manage"; // select: for applying templates, manage: for template management
}

export function TemplateSelection({ service, onTemplateApplied, mode = "select" }: TemplateSelectionProps) {
  const [templates, setTemplates] = useState<ProxyTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const allTemplates = await TemplateManager.getAllAvailableTemplates();
      setTemplates(allTemplates);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load templates" });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTemplate = async (template: ProxyTemplate) => {
    if (template.isLastUsed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot delete",
        message: "Last Used Configuration cannot be deleted",
      });
      return;
    }

    try {
      await TemplateManager.deleteTemplate(template.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Template Deleted",
        message: `Template "${template.name}" has been deleted`,
      });
      await loadTemplates();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete template",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const saveLastUsedAsTemplate = async (template: ProxyTemplate) => {
    if (!template.isLastUsed) return;

    try {
      // Use the built-in method to add a template
      await TemplateManager.addTemplate(
        "Last Used Configuration Copy",
        "Copy of the proxy configuration that was active before it was disabled",
        template.settings,
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Template Saved",
        message: "Last Used Configuration saved as new template",
      });
      await loadTemplates();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save template",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const applyTemplate = async (template: ProxyTemplate) => {
    try {
      // Apply HTTP proxy if exists
      if (template.settings.httpProxy) {
        const { server, port } = ProxyUtils.parseProxyAddress(template.settings.httpProxy);
        await NetworkUtils.setHttpProxy(service, server, port);
        await NetworkUtils.enableHttpProxy(service);
      }

      // Apply HTTPS proxy if exists
      if (template.settings.httpsProxy) {
        const { server, port } = ProxyUtils.parseProxyAddress(template.settings.httpsProxy);
        await NetworkUtils.setHttpsProxy(service, server, port);
        await NetworkUtils.enableHttpsProxy(service);
      }

      // Apply SOCKS proxy if exists
      if (template.settings.socksProxy) {
        const { server, port } = ProxyUtils.parseProxyAddress(template.settings.socksProxy);
        await NetworkUtils.setSocksProxy(service, server, port);
        await NetworkUtils.enableSocksProxy(service);
      }

      // Apply auto proxy URL if exists
      if (template.settings.autoProxyUrl) {
        await NetworkUtils.setAutoProxyUrl(service, template.settings.autoProxyUrl);
        await NetworkUtils.enableAutoProxyUrl(service);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Template Applied",
        message: `Template "${template.name}" applied successfully`,
      });

      // Call the callback to refresh the main page
      onTemplateApplied();

      // Return to the previous page (Show Network Proxy)
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply template",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const formatTemplateSubtitle = (template: ProxyTemplate): string => {
    const parts: string[] = [];
    if (template.settings.httpProxy) parts.push(`HTTP: ${template.settings.httpProxy}`);
    if (template.settings.httpsProxy) parts.push(`HTTPS: ${template.settings.httpsProxy}`);
    if (template.settings.socksProxy) parts.push(`SOCKS: ${template.settings.socksProxy}`);
    if (template.settings.autoProxyUrl) parts.push(`Auto: ${template.settings.autoProxyUrl}`);
    return parts.join(", ");
  };

  const getTemplateIcon = (template: ProxyTemplate): Icon => {
    if (template.isLastUsed) return Icon.Clock;
    return Icon.Document;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search templates...">
      <List.Section title={mode === "select" ? "Select Template to Apply" : "Manage Proxy Templates"}>
        {templates.map((template) => (
          <List.Item
            key={template.id}
            title={template.name}
            subtitle={formatTemplateSubtitle(template)}
            icon={getTemplateIcon(template)}
            accessories={[{ text: template.isLastUsed ? "Last Used" : "Custom" }]}
            actions={
              <ActionPanel>
                {mode === "select" ? (
                  // Select mode: Apply template (from proxy status selection)
                  <Action title="Apply Template" icon={Icon.Play} onAction={() => applyTemplate(template)} />
                ) : (
                  // Manage mode: Template management actions
                  <>
                    {template.isLastUsed ? (
                      <Action
                        title="Save as Template"
                        icon={Icon.SaveDocument}
                        onAction={() => saveLastUsedAsTemplate(template)}
                      />
                    ) : (
                      <Action
                        title="Delete Template"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => deleteTemplate(template)}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      />
                    )}
                  </>
                )}

                <Action.Push
                  title="Add New Template"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={
                    <CreateTemplateForm
                      onSave={() => {
                        loadTemplates();
                      }}
                    />
                  }
                />

                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadTemplates}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {templates.length === 0 && !isLoading && (
        <List.EmptyView
          title={mode === "select" ? "No Templates Available" : "No Templates Created"}
          description={
            mode === "select"
              ? "Create a proxy template first or configure proxy settings"
              : "Create your first proxy template"
          }
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New Template"
                icon={Icon.Plus}
                target={
                  <CreateTemplateForm
                    onSave={() => {
                      loadTemplates();
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
