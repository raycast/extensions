import React, { useState, useEffect } from "react";
import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { saveOTPConfigs } from "./utils/storage";
import { parseOTPFromJSON } from "./utils/parser";
import fs from "fs";

export default function Command() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (selectedFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No File Selected",
        message: "Please select a JSON file to import",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Read file content
      const fileContent = fs.readFileSync(selectedFiles[0], "utf-8");

      // Parse JSON content
      const newConfigs = parseOTPFromJSON(fileContent);

      if (newConfigs.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Import Failed",
          message: "No valid OTP configurations found in the file",
        });
        setIsSubmitting(false);
        return;
      }

      // Replace all existing configs with the new ones
      await saveOTPConfigs(newConfigs);

      await showToast({
        style: Toast.Style.Success,
        title: "Import Successful",
        message: `Imported ${newConfigs.length} OTP configurations`,
      });

      // Return to the main view after successful import
      await popToRoot();
    } catch (error) {
      console.error("Error importing OTPs:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message: "Failed to import OTP configurations",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle file selection changes
  useEffect(() => {
    if (selectedFiles.length > 0) {
      // Auto-import when a file is selected
      handleSubmit();
    }
  }, [selectedFiles]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Otp/2fa Codes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.Description
        title="Import OTP Codes"
        text="Select a JSON file containing OTP configurations to import. This will replace all existing configurations."
      />

      <Form.Separator />

      <Form.FilePicker
        id="filePicker"
        title="JSON File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        onChange={setSelectedFiles}
        value={selectedFiles}
        info="The JSON file should contain an array of otpauth:// URLs"
      />

      {selectedFiles.length > 0 && (
        <Form.Description title="Selected File" text={selectedFiles[0].split("/").pop() || ""} />
      )}
    </Form>
  );
}
