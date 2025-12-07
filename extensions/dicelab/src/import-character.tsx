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
import { fetchDdbCharacter } from "./utils/ddb-fetch";

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
      let jsonData: string;

      // Handle inline JSON - pass directly to WASM
      if (parsed.kind === "inline") {
        await showToast({
          style: Toast.Style.Animated,
          title: "Importing...",
          message: "Detected inline D&D Beyond JSON",
        });
        jsonData = parsed.value;
      } else {
        // For character ID/URL - fetch the JSON first
        await showToast({
          style: Toast.Style.Animated,
          title: "Fetching...",
          message: `Fetching character ${parsed.value} from D&D Beyond`,
        });

        jsonData = await fetchDdbCharacter(parsed.value);

        // Debug logging
        console.log("[DEBUG] Fetched JSON length:", jsonData.length);
        console.log(
          "[DEBUG] JSON starts with {:",
          jsonData.trim().startsWith("{"),
        );
        console.log("[DEBUG] First 150 chars:", jsonData.substring(0, 150));

        await showToast({
          style: Toast.Style.Animated,
          title: "Importing...",
          message: "Processing character data",
        });
      }

      // Pass the JSON to WASM for parsing
      console.log(
        "[DEBUG] Calling engine.importDdb with JSON length:",
        jsonData.length,
      );
      const wasmResult = await engine.importDdb(jsonData);
      console.log("[DEBUG] WASM importDdb returned:", wasmResult);

      await syncAliasesToStorage();

      const aliases = engine.getAliases();
      console.log("[DEBUG] getAliases() returned:", aliases);

      // Fix: aliases is a Map, not an Object, so use .size instead of Object.keys().length
      const count =
        aliases instanceof Map ? aliases.size : Object.keys(aliases).length;
      console.log("[DEBUG] Alias count:", count);

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
