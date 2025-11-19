import React from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { findXcodesPath, downloadXcode, listAvailable } from "./utils/xcodes";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);

  useEffect(() => {
    const xcodesPath = findXcodesPath();
    if (xcodesPath) {
      try {
        const versions = listAvailable(xcodesPath);
        setAvailableVersions(
          versions.filter((v) => !v.isInstalled).map((v) => v.version),
        );
      } catch (err) {
        console.error("Failed to load versions:", err);
      }
    }
  }, []);

  const handleSubmit = async (values: { version: string }) => {
    const xcodesPath = findXcodesPath();

    if (!xcodesPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "xcodes not found",
        message: "Install with: brew install xcodesorg/made/xcodes",
      });
      return;
    }

    if (!values.version || values.version.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a version number",
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Downloading Xcode ${values.version}...`,
    });

    try {
      await downloadXcode(xcodesPath, values.version);

      toast.style = Toast.Style.Success;
      toast.title = `Xcode ${values.version} downloaded successfully`;

      setTimeout(() => popToRoot(), 1000);
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = error.message;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Download Xcode"
            icon={Icon.Download}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Download Xcode"
        text="Download a specific version of Xcode without installing it. The downloaded file will be saved but not installed."
      />

      {availableVersions.length > 0 ? (
        <Form.Dropdown
          id="version"
          title="Xcode Version"
          placeholder="Select a version"
        >
          {availableVersions.map((version) => (
            <Form.Dropdown.Item
              key={version}
              value={version}
              title={`Xcode ${version}`}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField
          id="version"
          title="Xcode Version"
          placeholder="e.g., 16.4, 15.3"
          info="Enter the exact version number you want to download"
        />
      )}

      <Form.Description text="This will download the Xcode .xip file to your Downloads folder. You can install it later using the 'Install Xcode' command or manually." />
    </Form>
  );
}
