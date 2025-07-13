import { List, showToast, Toast, ActionPanel, Action, Clipboard, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { ProxySettings, ProxyInfoItem } from "./types/proxy";
import { NetworkUtils } from "./utils/network";
import { ProxyUtils } from "./utils/proxy";
import { TemplateManager } from "./utils/template";
import { EditProxyForm } from "./components/EditProxyForm";
import { EditBypassForm } from "./components/EditBypassForm";
import { CreateTemplateForm } from "./components/CreateTemplateForm";
import { TemplateSelection } from "./components/TemplateSelection";
import React from "react";

export default function Command() {
  const [items, setItems] = useState<ProxyInfoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [service, setService] = useState<string>("");
  const [settings, setSettings] = useState<ProxySettings>({});

  const fetchProxySettings = async () => {
    try {
      setIsLoading(true);

      // Get current network service
      const currentService = await NetworkUtils.getPrimaryNetworkService();
      setService(currentService);

      // Try to get proxy settings using scutil first (more reliable)
      let proxySettings = await NetworkUtils.getProxySettingsViaScutil();

      // If scutil doesn't provide enough info, try networksetup
      if (!proxySettings.proxyEnabled) {
        proxySettings = await NetworkUtils.getProxySettingsViaNetworksetup(currentService);
      }

      setSettings(proxySettings);

      // Create items for display
      const proxyItems = ProxyUtils.createProxyInfoItems(proxySettings, currentService);
      setItems(proxyItems);
    } catch (error) {
      console.error("Error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to get network proxy settings",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProxySettings();
  }, []);

  const handleCopyAll = async () => {
    const proxyInfo = ProxyUtils.formatProxyInfoForCopy(settings, service);
    await Clipboard.copy(proxyInfo);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
      message: "All proxy settings copied successfully",
    });
  };

  const handleCopyItem = async (item: ProxyInfoItem) => {
    if (item.value) {
      await Clipboard.copy(item.value);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
        message: `${item.title} copied successfully`,
      });
    }
  };

  const handleDisableProxy = async (proxyType: "http" | "https" | "socks" | "auto") => {
    try {
      switch (proxyType) {
        case "http":
          await NetworkUtils.disableHttpProxy(service);
          break;
        case "https":
          await NetworkUtils.disableHttpsProxy(service);
          break;
        case "socks":
          await NetworkUtils.disableSocksProxy(service);
          break;
        case "auto":
          await NetworkUtils.disableAutoProxyUrl(service);
          break;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `${proxyType.toUpperCase()} proxy disabled successfully`,
      });

      // Refresh the data
      await fetchProxySettings();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to disable proxy",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleEnableProxy = async (proxyType: "http" | "https" | "socks" | "auto") => {
    try {
      switch (proxyType) {
        case "http":
          await NetworkUtils.enableHttpProxy(service);
          break;
        case "https":
          await NetworkUtils.enableHttpsProxy(service);
          break;
        case "socks":
          await NetworkUtils.enableSocksProxy(service);
          break;
        case "auto":
          await NetworkUtils.enableAutoProxyUrl(service);
          break;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `${proxyType.toUpperCase()} proxy enabled successfully`,
      });

      // Refresh the data
      await fetchProxySettings();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to enable proxy",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleDisableAllProxies = async () => {
    try {
      // Save current settings as "last used" before disabling
      if (settings.proxyEnabled) {
        await TemplateManager.saveLastUsedSettings(settings);
      }

      // Disable all proxy types
      await NetworkUtils.disableHttpProxy(service);
      await NetworkUtils.disableHttpsProxy(service);
      await NetworkUtils.disableSocksProxy(service);
      await NetworkUtils.disableAutoProxyUrl(service);

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "All proxies disabled successfully",
      });

      // Refresh the data
      await fetchProxySettings();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to disable proxies",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleToggleProxyStatus = async () => {
    if (settings.proxyEnabled) {
      await handleDisableAllProxies();
    } else {
      // When enabling, try to apply the last used template automatically
      try {
        const lastUsedSettings = await TemplateManager.getLastUsedSettings();
        if (lastUsedSettings && lastUsedSettings.proxyEnabled) {
          await applyLastUsedTemplate(lastUsedSettings);
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "No Last Used Configuration",
            message: "Use Cmd+T to select a template to enable",
          });
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to enable proxy",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  };

  const applyLastUsedTemplate = async (lastUsedSettings: ProxySettings) => {
    try {
      // First disable all proxies
      await NetworkUtils.disableHttpProxy(service);
      await NetworkUtils.disableHttpsProxy(service);
      await NetworkUtils.disableSocksProxy(service);
      await NetworkUtils.disableAutoProxyUrl(service);

      // Then apply the last used settings
      if (lastUsedSettings.httpProxy) {
        const { server, port } = ProxyUtils.parseProxyAddress(lastUsedSettings.httpProxy);
        await NetworkUtils.setHttpProxy(service, server, port);
        await NetworkUtils.enableHttpProxy(service);
      }

      if (lastUsedSettings.httpsProxy) {
        const { server, port } = ProxyUtils.parseProxyAddress(lastUsedSettings.httpsProxy);
        await NetworkUtils.setHttpsProxy(service, server, port);
        await NetworkUtils.enableHttpsProxy(service);
      }

      if (lastUsedSettings.socksProxy) {
        const { server, port } = ProxyUtils.parseProxyAddress(lastUsedSettings.socksProxy);
        await NetworkUtils.setSocksProxy(service, server, port);
        await NetworkUtils.enableSocksProxy(service);
      }

      if (lastUsedSettings.autoProxyUrl) {
        await NetworkUtils.setAutoProxyUrl(service, lastUsedSettings.autoProxyUrl);
        await NetworkUtils.enableAutoProxyUrl(service);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Proxy Enabled",
        message: "Last used proxy configuration has been applied successfully",
      });

      // Refresh the data
      await fetchProxySettings();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply last used configuration",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const renderActions = (item: ProxyInfoItem) => {
    const actions: React.ReactElement[] = [];

    // Special handling for Proxy Status item
    if (item.type === "status") {
      if (settings.proxyEnabled) {
        actions.push(
          <Action
            key="disable-all"
            title="Disable All Proxies"
            icon={Icon.XMarkCircle}
            onAction={handleDisableAllProxies}
          />,
        );
      } else {
        // When proxies are disabled, show different actions
        actions.push(
          <Action
            key="enable-last-used"
            title="Enable Last Used"
            icon={Icon.CheckCircle}
            onAction={handleToggleProxyStatus}
          />,
        );

        actions.push(
          <Action.Push
            key="select-template"
            title="Select Template"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            target={
              <TemplateSelection
                service={service}
                onTemplateApplied={() => {
                  fetchProxySettings();
                }}
              />
            }
          />,
        );
      }

      // Add refresh action for status item
      actions.push(
        <Action
          key="refresh"
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={fetchProxySettings}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />,
      );

      return actions;
    }

    // Special handling for Network Service item
    if (item.type === "service") {
      actions.push(
        <Action
          key="copy-all"
          title="Copy All Settings"
          icon={Icon.CopyClipboard}
          onAction={handleCopyAll}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />,
      );

      actions.push(
        <Action
          key="refresh"
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={fetchProxySettings}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />,
      );

      return actions;
    }

    // Always show copy action if there's a value
    if (item.value) {
      actions.push(<Action key="copy" title="Copy" icon={Icon.Clipboard} onAction={() => handleCopyItem(item)} />);
    }

    // Show edit action for editable items (proxy types and bypass)
    if (item.editable) {
      if (item.type === "http" || item.type === "https" || item.type === "socks" || item.type === "auto") {
        actions.push(
          <Action.Push
            key="edit"
            title="Edit"
            icon={Icon.Pencil}
            target={
              <EditProxyForm
                proxyType={item.type}
                currentValue={item.value || ""}
                service={service}
                onSave={fetchProxySettings}
              />
            }
          />,
        );
      } else if (item.type === "bypass") {
        actions.push(
          <Action.Push
            key="edit"
            title="Edit"
            icon={Icon.Pencil}
            target={<EditBypassForm currentValue={item.value || ""} service={service} onSave={fetchProxySettings} />}
          />,
        );
      }
    }

    // Show enable/disable actions for proxy types
    if (item.type === "http" || item.type === "https" || item.type === "socks" || item.type === "auto") {
      // If proxy exists, show disable option
      if (item.value) {
        actions.push(
          <Action
            key="disable"
            title="Disable"
            icon={Icon.XMarkCircle}
            onAction={() => handleDisableProxy(item.type as "http" | "https" | "socks" | "auto")}
          />,
        );
      }

      // If proxy doesn't exist but we have a previous configuration, show enable option
      if (!item.value) {
        actions.push(
          <Action
            key="enable"
            title="Enable"
            icon={Icon.CheckCircle}
            onAction={() => handleEnableProxy(item.type as "http" | "https" | "socks" | "auto")}
          />,
        );
      }
    }

    // Global actions
    actions.push(
      <Action
        key="copy-all"
        title="Copy All Settings"
        icon={Icon.CopyClipboard}
        onAction={handleCopyAll}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />,
    );

    // Add create template action if proxy is enabled
    if (settings.proxyEnabled) {
      actions.push(
        <Action.Push
          key="create-template"
          title="Save as Template"
          icon={Icon.SaveDocument}
          target={<CreateTemplateForm onSave={() => {}} />}
        />,
      );
    }

    // Add template management action
    actions.push(
      <Action.Push
        key="manage-templates"
        title="Manage Proxy Templates"
        icon={Icon.Gear}
        target={
          <TemplateSelection
            service={service}
            mode="manage"
            onTemplateApplied={() => {
              fetchProxySettings();
            }}
          />
        }
      />,
    );

    actions.push(
      <Action
        key="refresh"
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={fetchProxySettings}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />,
    );

    return actions;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search proxy settings...">
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.icon}
          accessories={item.accessories}
          actions={<ActionPanel>{renderActions(item)}</ActionPanel>}
        />
      ))}
    </List>
  );
}
