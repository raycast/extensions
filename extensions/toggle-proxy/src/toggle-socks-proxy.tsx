import { ActionPanel, Action, Form, Detail, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import * as fs from "fs";
import * as path from "path";
import { generateXrayConfig, getXrayPath } from "./utils/xray-config";

export default function GenerateXrayConfig() {
  const prefs = getPreferenceValues<Preferences>();
  const [vlessConfig, setVlessConfig] = useState<string>("");
  const [fileName, setFileName] = useState<string>("config.json");
  const [customCountries, setCustomCountries] = useState<string>("");
  const [customDomains, setCustomDomains] = useState<string>("");
  const [customIPs, setCustomIPs] = useState<string>("");
  const [routingMode, setRoutingMode] = useState<string>("default");
  const [xrayConfig, setXrayConfig] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  function saveConfigToFile(config: string, fileName: string): string {
    try {
      const expandedPath = getXrayPath(prefs.xrayPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(expandedPath)) {
        fs.mkdirSync(expandedPath, { recursive: true });
      }

      const filePath = path.join(expandedPath, fileName);
      fs.writeFileSync(filePath, config, "utf8");

      return filePath;
    } catch (error) {
      throw new Error(`Error saving file: ${(error as Error).message}`);
    }
  }

  function handleGenerate() {
    try {
      const config = generateXrayConfig(vlessConfig, {
        host: prefs.host,
        port: prefs.port,
        customCountries: routingMode === "custom" ? customCountries : "",
        customDomains: routingMode === "custom" ? customDomains : "",
        customIPs: routingMode === "custom" ? customIPs : "",
      });
      const configJson = JSON.stringify(config, null, 2);
      setXrayConfig(configJson);

      // Save config to file
      const savedFilePath = saveConfigToFile(configJson, fileName);
      setSavedPath(savedFilePath);

      showToast(Toast.Style.Success, `Configuration saved: ${savedFilePath}`);
    } catch (error) {
      showToast(Toast.Style.Failure, (error as Error).message);
    }
  }

  function handleReset() {
    setXrayConfig(null);
    setVlessConfig("");
    setSavedPath(null);
    setFileName("config.json");
    setCustomCountries("");
    setCustomDomains("");
    setCustomIPs("");
    setRoutingMode("default");
  }

  return (
    <>
      {!xrayConfig ? (
        <Form
          actions={
            <ActionPanel>
              <Action title="Generate and Save Config" onAction={handleGenerate} />
            </ActionPanel>
          }
        >
          <Form.TextArea
            id="vlessConfig"
            title="VLESS Config"
            placeholder="Enter a VLESS string (e.g., vless://...)"
            value={vlessConfig}
            onChange={setVlessConfig}
          />

          <Form.Separator />

          <Form.TextField
            id="fileName"
            title="File Name"
            placeholder="config.json"
            value={fileName}
            onChange={setFileName}
          />

          <Form.Dropdown id="routingMode" title="Routing Mode" value={routingMode} onChange={setRoutingMode}>
            <Form.Dropdown.Item value="default" title="Default" />
            <Form.Dropdown.Item value="custom" title="Custom" />
          </Form.Dropdown>

          {routingMode === "custom" && (
            <>
              <Form.Separator />

              <Form.TextField
                id="customCountries"
                title="Additional Countries"
                placeholder="us,uk,de (comma-separated)"
                value={customCountries}
                onChange={setCustomCountries}
              />

              <Form.TextField
                id="customDomains"
                title="Additional Domains"
                placeholder="example.com,test.org (comma-separated)"
                value={customDomains}
                onChange={setCustomDomains}
              />

              <Form.TextField
                id="customIPs"
                title="Additional IPs"
                placeholder="192.168.1.0/24,10.0.0.0/8 (comma-separated)"
                value={customIPs}
                onChange={setCustomIPs}
              />
            </>
          )}

          <Form.Separator />

          <Form.Description title="Save Settings" text={`Config will be saved to: ${prefs.xrayPath || "~/xray"}`} />

          <Form.Description
            title="SOCKS Settings"
            text={`Proxy will listen on: ${prefs.host || "127.0.0.1"}:${prefs.port || "1080"}`}
          />
        </Form>
      ) : (
        <Detail
          markdown={`# Configuration Saved!\n\n**Path:** \`${savedPath}\`\n\n**Config:**\n\`\`\`json\n${xrayConfig}\n\`\`\``}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Config" content={xrayConfig} />
              <Action.CopyToClipboard title="Copy File Path" content={savedPath || ""} />
              <Action.OpenWith title="Open Folder" path={path.dirname(savedPath || "")} />
              <Action title="Create New Config" onAction={handleReset} />
            </ActionPanel>
          }
        />
      )}
    </>
  );
}
