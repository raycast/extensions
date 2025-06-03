"use client";

import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Clipboard,
  getPreferenceValues,
  popToRoot,
  Icon,
  List,
} from "@raycast/api";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { useState } from "react";
import { HashDropdown } from "./components/dropdown";
import type { Values } from "./types";

interface ExtensionPreferences {
  popRootAfterSubmit: boolean;
}

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Array<{ algorithm: string; hash: string }>>([]);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(null);

  async function handleSubmit(values: Values) {
    if (!values.file || values.file.length === 0) {
      showToast({
        title: "Error",
        message: "Please select a file",
      });
      return;
    }

    setIsLoading(true);
    const filePath = values.file[0];

    try {
      // Get file info
      const stats = fs.statSync(filePath);
      const fileSize = (stats.size / 1024 / 1024).toFixed(2);
      const fileName = path.basename(filePath);

      setFileInfo({ name: fileName, size: fileSize });

      const buff = fs.readFileSync(filePath);
      const hash = createHash(values.dropdown);
      hash.update(buff);
      const result = hash.digest("hex");

      const commonHashes = ["md5", "sha1", "sha256", "sha512"];
      const allResults = [];

      for (const algorithm of commonHashes) {
        if (algorithm === values.dropdown) {
          allResults.push({ algorithm: algorithm.toUpperCase(), hash: result });
        } else {
          try {
            const h = createHash(algorithm);
            h.update(buff);
            allResults.push({ algorithm: algorithm.toUpperCase(), hash: h.digest("hex") });
          } catch (error) {
            console.warn(`Algorithm ${algorithm} not available`);
          }
        }
      }

      if (!commonHashes.includes(values.dropdown)) {
        allResults.unshift({ algorithm: values.dropdown.toUpperCase(), hash: result });
      }

      setResults(allResults);

      await Clipboard.copy(result);
      await showToast({
        title: `${values.dropdown.toUpperCase()} hash copied!`,
        message: `${fileName} (${fileSize} MB)`,
      });

      if (preferences.popRootAfterSubmit) {
        await popToRoot();
      }
    } catch (err) {
      if (err instanceof Error) {
        await showToast({
          title: "Error",
          message: err.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function copyHash(hash: string, algorithm: string) {
    await Clipboard.copy(hash);
    await showToast({ title: `${algorithm} hash copied to clipboard` });
  }

  if (results.length > 0 && fileInfo) {
    return (
      <List navigationTitle={`Hashes for ${fileInfo.name}`}>
        <List.Item title="File Information" subtitle={`${fileInfo.name} • ${fileInfo.size} MB`} icon={Icon.Document} />
        {results.map((result) => (
          <List.Item
            key={result.algorithm}
            title={result.algorithm}
            subtitle={result.hash}
            icon={Icon.Key}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Hash"
                  icon={Icon.Clipboard}
                  onAction={() => copyHash(result.hash, result.algorithm)}
                />
                <Action
                  title="Back to Form"
                  icon={Icon.ArrowLeft}
                  onAction={() => {
                    setResults([]);
                    setFileInfo(null);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Key} onSubmit={handleSubmit} title="Calculate Hash" />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Select File"
        allowMultipleSelection={false}
        info="Choose the file to calculate hash for"
      />
      <HashDropdown />
    </Form>
  );
}
