import { Action, ActionPanel, Form, Icon as RcIcon, Toast, showInFinder, showToast } from "@raycast/api";
import { useState } from "react";
import { Icon } from "./types";
import fetch from "node-fetch";
import os from "os";
import path from "path";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
const streamPipeline = promisify(pipeline);

export default function DownloadForm(props: { icon: Icon }): JSX.Element {
  const [platform, setPlatform] = useState("Web");
  const [selectedColor, setSelectedColor] = useState("Black");
  const [size, setSize] = useState("18");
  const [format, setFormat] = useState("PNG");

  async function download() {
    const progressToast = await showToast({ title: "Downloading...", style: Toast.Style.Animated });
    try {
      const host = "https://fonts.gstatic.com";
      const assetType = getAssetType(format);
      if (!assetType) {
        throw new Error(`couldn't get download url.`);
      }
      if (assetType) {
        const url = `${host}/s/i/materialicons/${props.icon.name}/v${props.icon.version}/${assetType}`;
        const iconName = `icon_${props.icon.name}-${assetType}`;
        const filePath = path.join(os.homedir(), "Downloads", iconName);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        await streamPipeline(response.body as any, createWriteStream(filePath));

        progressToast.hide();
        await showToast({
          title: `Icon ${props.icon.name} has been downloaded to Downloads directory.`,
          primaryAction: {
            title: "Open Downloaded Icon",
            onAction: (toast) => {
              showInFinder(filePath).then();
              toast.hide();
            },
          },
        });
      }
    } catch (error) {
      progressToast?.hide();
      await showToast({ title: "Error", style: Toast.Style.Failure });
    }
  }
  function getAssetType(format: string): string | undefined {
    const color = selectedColor.toLowerCase();
    switch (platform) {
      case "Web":
        return format === "SVG" ? `24px.svg` : `${color}-${size}dp.zip`;
      case "Android":
        return `${color}-android.zip`;
      case "IOS":
        return `${color}-ios.zip`;

      default:
        return undefined;
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            icon={RcIcon.Download}
            title="Download"
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={download}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="platform" title="Platform" onChange={setPlatform}>
        <Form.Dropdown.Item title="Web" value="Web" />
        <Form.Dropdown.Item title="Android" value="Android" />
        <Form.Dropdown.Item title="IOS" value="IOS" />
      </Form.Dropdown>

      <Form.Dropdown id="color" title="Color" onChange={setSelectedColor}>
        <Form.Dropdown.Item
          title="Black"
          value="Black"
          icon={{ source: RcIcon.Circle, tintColor: { dark: "black", light: "black" } }}
        />
        <Form.Dropdown.Item
          title="White"
          value="White"
          icon={{ source: RcIcon.Circle, tintColor: { dark: "white", light: "white" } }}
        />
      </Form.Dropdown>

      {platform === "Web" && (
        <>
          <Form.Dropdown id="format" title="Format" onChange={setFormat}>
            <Form.Dropdown.Item title="PNG" value="PNG" />
            <Form.Dropdown.Item title="SVG" value="SVG" />
          </Form.Dropdown>

          {format === "PNG" && (
            <Form.Dropdown id="size" title="Size" onChange={setSize}>
              <Form.Dropdown.Item title="18dp" value="18" />
              <Form.Dropdown.Item title="24dp" value="24" />
              <Form.Dropdown.Item title="36dp" value="36" />
              <Form.Dropdown.Item title="48dp" value="48" />
            </Form.Dropdown>
          )}
        </>
      )}
    </Form>
  );
}
