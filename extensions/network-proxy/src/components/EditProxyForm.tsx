import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ProxyUtils } from "../utils/proxy";
import { NetworkUtils } from "../utils/network";
import { showFailureToast } from "@raycast/utils";

interface EditProxyFormProps {
  proxyType: "http" | "https" | "socks" | "auto";
  currentValue: string;
  service: string;
  onSave: () => void;
}

export function EditProxyForm({ proxyType, currentValue, service, onSave }: EditProxyFormProps) {
  const [value, setValue] = useState(currentValue);
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  const getTitle = () => {
    switch (proxyType) {
      case "http":
        return "Edit HTTP Proxy";
      case "https":
        return "Edit HTTPS Proxy";
      case "socks":
        return "Edit SOCKS Proxy";
      case "auto":
        return "Edit Auto Proxy URL";
      default:
        return "Edit Proxy";
    }
  };

  const getPlaceholder = () => {
    switch (proxyType) {
      case "http":
      case "https":
      case "socks":
        return "server:port (e.g., 127.0.0.1:8080)";
      case "auto":
        return "http://example.com/proxy.pac";
      default:
        return "";
    }
  };

  const validateInput = (input: string): boolean => {
    if (proxyType === "auto") {
      return ProxyUtils.validateProxyUrl(input);
    } else {
      try {
        const { server, port } = ProxyUtils.parseProxyAddress(input);
        return ProxyUtils.validateServer(server) && ProxyUtils.validatePort(port);
      } catch {
        return false;
      }
    }
  };

  const handleSave = async () => {
    if (!validateInput(value)) {
      await showFailureToast(new Error(proxyType === "auto" ? "Invalid URL" : "Invalid server:port format"), {
        title: "Failed to create template",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (proxyType === "auto") {
        await NetworkUtils.setAutoProxyUrl(service, value);
        await NetworkUtils.enableAutoProxyUrl(service);
      } else {
        const { server, port } = ProxyUtils.parseProxyAddress(value);

        switch (proxyType) {
          case "http":
            await NetworkUtils.setHttpProxy(service, server, port);
            await NetworkUtils.enableHttpProxy(service);
            break;
          case "https":
            await NetworkUtils.setHttpsProxy(service, server, port);
            await NetworkUtils.enableHttpsProxy(service);
            break;
          case "socks":
            await NetworkUtils.setSocksProxy(service, server, port);
            await NetworkUtils.enableSocksProxy(service);
            break;
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `${getTitle().replace("Edit ", "")} updated successfully`,
      });

      onSave();
      pop(); // Return to previous page (Show Network Proxy)
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update proxy",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSave} title="Save" />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="proxyValue"
        title={getTitle().replace("Edit ", "")}
        placeholder={getPlaceholder()}
        value={value}
        onChange={setValue}
        info={
          proxyType === "auto"
            ? "Enter the complete URL for the proxy auto-config file"
            : "Enter the proxy server address and port (e.g., 127.0.0.1:8080)"
        }
      />
    </Form>
  );
}
