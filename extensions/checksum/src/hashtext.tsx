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
  const [originalText, setOriginalText] = useState<string>("");

  async function handleSubmit(values: Values) {
    if (!values.textfield.trim()) {
      showToast({
        title: "Error",
        message: "Please enter some text to hash",
      });
      return;
    }

    setIsLoading(true);
    const text = values.textfield;
    setOriginalText(text);

    try {
      const buff = Buffer.from(text, "utf8");

      const algorithms = ["md5", "sha1", "sha256", "sha512"];
      const allResults = [];

      for (const algorithm of algorithms) {
        try {
          const hash = createHash(algorithm);
          hash.update(buff);
          allResults.push({
            algorithm: algorithm.toUpperCase(),
            hash: hash.digest("hex"),
          });
        } catch (error) {
          console.warn(`Algorithm ${algorithm} not available`);
        }
      }

      if (!algorithms.includes(values.dropdown)) {
        try {
          const hash = createHash(values.dropdown);
          hash.update(buff);
          allResults.unshift({
            algorithm: values.dropdown.toUpperCase(),
            hash: hash.digest("hex"),
          });
        } catch (error) {
          console.warn(`Selected algorithm ${values.dropdown} not available`);
        }
      }

      setResults(allResults);

      const selectedHash = allResults.find((r) => r.algorithm.toLowerCase() === values.dropdown)?.hash;
      if (selectedHash) {
        await Clipboard.copy(selectedHash);
        await showToast({
          title: `${values.dropdown.toUpperCase()} hash copied!`,
          message: `Text length: ${text.length} characters`,
        });
      }

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

  if (results.length > 0) {
    return (
      <List navigationTitle="Text Hashes">
        <List.Item
          title="Original Text"
          subtitle={originalText.length > 50 ? `${originalText.substring(0, 50)}...` : originalText}
          accessories={[{ text: `${originalText.length} chars` }]}
          icon={Icon.Text}
        />
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
                    setOriginalText("");
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
      <Form.TextArea
        id="textfield"
        title="Text to Hash"
        placeholder="Enter the text you want to hash..."
        info="The hash will be calculated for the exact text you enter"
      />
      <HashDropdown />
    </Form>
  );
}
