"use client";

import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { useState } from "react";
import { HashDropdown } from "./components/dropdown";
import type { Values } from "./types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: Values) {
    if (!values.textfield.trim()) {
      showToast({
        title: "Error",
        message: "Please enter the expected checksum",
        style: Toast.Style.Failure,
      });
      return;
    }

    if (!values.file || values.file.length === 0) {
      showToast({
        title: "Error",
        message: "Please select a file",
        style: Toast.Style.Failure,
      });
      return;
    }

    setIsLoading(true);
    const expectedHash = values.textfield.trim().toLowerCase();
    const filePath = values.file[0];

    try {
      // Check if file exists and get stats
      const stats = fs.statSync(filePath);
      const fileSize = (stats.size / 1024 / 1024).toFixed(2); // MB
      const fileName = path.basename(filePath);

      const buff = fs.readFileSync(filePath);
      const hash = createHash(values.dropdown);
      hash.update(buff);
      const result = hash.digest("hex").toLowerCase();

      if (expectedHash === result) {
        showToast({
          title: "✅ Checksums Match!",
          message: `${fileName} (${fileSize} MB) is verified`,
          style: Toast.Style.Success,
        });
      } else {
        showToast({
          title: "❌ Checksums Don't Match!",
          message: `Expected: ${expectedHash}\nActual: ${result}`,
          style: Toast.Style.Failure,
        });
      }
    } catch (err) {
      if (err instanceof Error) {
        showToast({
          title: "Error",
          message: err.message,
          style: Toast.Style.Failure,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.CheckCircle} onSubmit={handleSubmit} title="Verify Checksum" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="textfield"
        title="Expected Checksum"
        placeholder="Enter the expected hash value"
        info="Paste the checksum you want to verify against"
      />
      <Form.FilePicker
        id="file"
        title="Select File"
        allowMultipleSelection={false}
        info="Choose the file you want to verify"
      />
      <HashDropdown />
    </Form>
  );
}
