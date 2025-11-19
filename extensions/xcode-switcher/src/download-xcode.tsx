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
import { useState } from "react";
import { findXcodesPath, downloadXcode, listAvailable } from "./utils/xcodes";
import { t } from "./utils/i18n";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);

  useState(() => {
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
  });

  const handleSubmit = async (values: { version: string }) => {
    const xcodesPath = findXcodesPath();

    if (!xcodesPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("xcodes.notFound"),
        message: t("xcodes.installMessage"),
      });
      return;
    }

    if (!values.version || values.version.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: t("error"),
        message: t("download.enterVersionPrompt"),
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: t("download.downloading", { version: values.version }),
    });

    try {
      await downloadXcode(xcodesPath, values.version);

      toast.style = Toast.Style.Success;
      toast.title = t("download.success", { version: values.version });

      setTimeout(() => popToRoot(), 1000);
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = t("error");
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
            title={t("download.title")}
            icon={Icon.Download}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={t("download.title")}
        text={t("download.description")}
      />

      {availableVersions.length > 0 ? (
        <Form.Dropdown
          id="version"
          title="Xcode Version"
          placeholder={t("download.selectVersion")}
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
          info={t("download.enterVersion")}
        />
      )}

      <Form.Description text={t("download.note")} />
    </Form>
  );
}
