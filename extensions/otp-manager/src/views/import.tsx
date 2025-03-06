import { Form, ActionPanel, Action, popToRoot } from "@raycast/api";
import { showFailureToast, showSuccessToast } from "@raycast/utils";
import React, { useState } from "react";
import fs from "fs/promises";
import path from "path";
import { parseOTPFromJSON } from "../utils/parser";
import { saveOTPConfigs, loadOTPConfigs } from "../utils/storage";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [filePath, setFilePath] = useState<string>("");

  async function handleSubmit() {
    try {
      setIsLoading(true);

      if (!filePath) {
        showFailureToast("Please select a JSON file");
        return;
      }

      // Read the JSON file
      const content = await fs.readFile(path.resolve(filePath), "utf-8");

      // Parse OTP codes
      const otpConfigs = parseOTPFromJSON(content);

      if (otpConfigs.length === 0) {
        showFailureToast("No valid OTP codes found in the file");
        return;
      }

      // Load existing configurations
      const existingConfigs = await loadOTPConfigs();

      // Combine with new configurations
      const updatedConfigs = [...existingConfigs, ...otpConfigs];

      // Save updated configurations
      await saveOTPConfigs(updatedConfigs);

      showSuccessToast(`Imported ${otpConfigs.length} OTP codes`);

      // Return to main view
      popToRoot();
    } catch (error) {
      console.error("Error importing OTP codes:", error);
      showFailureToast("An error occurred while importing OTP codes");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="JSON File"
        allowMultipleSelection={false}
        onChange={(files) => setFilePath(files[0])}
      />
      <Form.Description
        title="Expected Format"
        text="The file should contain an array of strings with OTP URLs in 'otpauth://totp/...' format"
      />
      <Form.Description
        title="Example"
        text='[
  "otpauth://totp/ServiceName?secret=ABC123&algorithm=SHA1&digits=7&period=30",
  "otpauth://totp/ServiceName2?secret=XYZ890&algorithm=SHA1&digits=7&period=30&issuer=Provider"
]'
      />
    </Form>
  );
}
