// Import D&D Beyond Character command

import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { useState } from "react";
import { getEngine, syncAliasesToStorage } from "./engine";
import { extractDdbInput } from "./utils/ddb";

export default function ImportCharacterCommand() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit() {
    if (!input.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Input",
        message: "Please enter a D&D Beyond character ID or URL",
      });
      return;
    }

    const parsed = extractDdbInput(input);
    setIsLoading(true);

    try {
      const engine = await getEngine();

      if (parsed.kind === "inline") {
        await showToast({
          style: Toast.Style.Animated,
          title: "Importing...",
          message: "Detected inline D&D Beyond JSON",
        });
      } else if (parsed.kind === "url") {
        await showToast({
          style: Toast.Style.Animated,
          title: "Importing...",
          message: `Using character ID ${parsed.value}`,
        });
      }

      await engine.importDdb(parsed.value);
      await syncAliasesToStorage();

      const aliases = engine.getAliases();
      const count = Object.keys(aliases).length;

      await showToast({
        style: Toast.Style.Success,
        title: "Import Successful",
        message: `Imported ${count} character values`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message:
          error instanceof Error ? error.message : "Failed to import character",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Character" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="characterInput"
        title="Character ID or URL"
        placeholder="https://www.dndbeyond.com/characters/12345678 or 12345678"
        value={input}
        onChange={setInput}
      />
      <Form.Description text="Enter a D&D Beyond character URL, ID, or raw JSON" />
    </Form>
  );
}
