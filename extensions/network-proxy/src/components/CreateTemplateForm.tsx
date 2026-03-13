import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { TemplateManager } from "../utils/template";
import { ProxySettings } from "../types/proxy";
import { showFailureToast } from "@raycast/utils";

interface CreateTemplateFormProps {
  onSave: () => void;
  initialSettings?: ProxySettings;
  isFromLastUsed?: boolean;
}

export function CreateTemplateForm({ onSave, initialSettings, isFromLastUsed = false }: CreateTemplateFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState(isFromLastUsed ? "Saved from last used configuration" : "");
  const [httpProxy, setHttpProxy] = useState(initialSettings?.httpProxy || "");
  const [httpsProxy, setHttpsProxy] = useState(initialSettings?.httpsProxy || "");
  const [socksProxy, setSocksProxy] = useState(initialSettings?.socksProxy || "");
  const [autoProxyUrl, setAutoProxyUrl] = useState(initialSettings?.autoProxyUrl || "");
  const [noProxy, setNoProxy] = useState(initialSettings?.noProxy || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Template name is required",
      });
      return;
    }

    if (!httpProxy && !httpsProxy && !socksProxy && !autoProxyUrl) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "At least one proxy setting must be configured",
      });
      return;
    }

    setIsLoading(true);
    try {
      const settings: ProxySettings = {
        httpProxy: httpProxy.trim() || undefined,
        httpsProxy: httpsProxy.trim() || undefined,
        socksProxy: socksProxy.trim() || undefined,
        autoProxyUrl: autoProxyUrl.trim() || undefined,
        noProxy: noProxy.trim() || undefined,
        proxyEnabled: true,
      };

      await TemplateManager.addTemplate(name.trim(), description.trim(), settings);

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: isFromLastUsed
          ? "Last used configuration saved as template successfully"
          : "Template created successfully",
      });

      onSave();
      popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create template" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title={isFromLastUsed ? "Save as Template" : "Create Template"} />
          <Action title="Cancel" onAction={popToRoot} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Template Name"
        placeholder="Enter template name"
        value={name}
        onChange={setName}
        info="A descriptive name for this proxy template"
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter template description (optional)"
        value={description}
        onChange={setDescription}
        info="Optional description of what this template is used for"
      />

      <Form.Separator />

      <Form.TextField
        id="httpProxy"
        title="HTTP Proxy"
        placeholder="server:port (e.g., 127.0.0.1:8080)"
        value={httpProxy}
        onChange={setHttpProxy}
        info="HTTP proxy server and port"
      />

      <Form.TextField
        id="httpsProxy"
        title="HTTPS Proxy"
        placeholder="server:port (e.g., 127.0.0.1:8080)"
        value={httpsProxy}
        onChange={setHttpsProxy}
        info="HTTPS proxy server and port"
      />

      <Form.TextField
        id="socksProxy"
        title="SOCKS Proxy"
        placeholder="server:port (e.g., 127.0.0.1:1080)"
        value={socksProxy}
        onChange={setSocksProxy}
        info="SOCKS proxy server and port"
      />

      <Form.TextField
        id="autoProxyUrl"
        title="Auto Proxy URL"
        placeholder="http://example.com/proxy.pac"
        value={autoProxyUrl}
        onChange={setAutoProxyUrl}
        info="URL to proxy auto-configuration file"
      />

      <Form.TextField
        id="noProxy"
        title="Bypass Domains"
        placeholder="localhost, 127.0.0.1, *.local"
        value={noProxy}
        onChange={setNoProxy}
        info="Comma-separated list of domains to bypass proxy"
      />
    </Form>
  );
}
