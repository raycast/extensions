import React, { useEffect, useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Clipboard, environment, open } from "@raycast/api";
import * as pako from "pako";
import * as fs from "fs/promises";
import * as path from "path";
import { LaunchProps } from "@raycast/api";

// Constants from TIO's frontend.js
const FIELD_SEPARATOR = String.fromCharCode(0xff); // \xff
const START_OF_EXTRA_FIELDS = String.fromCharCode(0xfe); // \xfe
const START_OF_SETTINGS = String.fromCharCode(0xf5); // \xf5

// UTF-8 string to Byte string (string of chars with char codes as byte values)
// Matches TIO's frontend.js implementation
function textToBinaryString(str: string): string {
  const s = String(str); // Ensure input is a string
  // Match TIO's frontend.js textToByteString
  return unescape(encodeURIComponent(s));
  /* // Previous Buffer.from method
    return Buffer.from(s, 'utf8').toString('binary');
    */
}

// Byte string to Uint8Array (for pako input)
function byteStringToByteArray(byteString: string): Uint8Array {
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }
  return byteArray;
}

// Uint8Array to Byte string (from pako output)
function byteArrayToByteString(byteArray: Uint8Array): string {
  let result = "";
  for (let i = 0; i < byteArray.length; i++) {
    result += String.fromCharCode(byteArray[i]);
  }
  return result;
}

// TIO's custom Base64 encoding: URL-safe, no padding
function tioSafeBase64Encode(byteString: string): string {
  // Standard URL-safe Base64 encoding as seen in the target permalinks
  return Buffer.from(byteString, "binary")
    .toString("base64")
    .replace(/\+/g, "-") // Standard URL-safe: + to -
    .replace(/\//g, "_") // Standard URL-safe: / to _
    .replace(/=+$/, ""); // Remove trailing padding
}

interface CommandFormValues {
  languageId: string;
  code: string;
  header?: string;
  footer?: string;
  inputStr?: string;
  argsStr?: string;
  settingsString?: string;
}

// Define the set of common language IDs to display
const COMMON_LANGUAGE_IDS = new Set([
  "python3",
  "javascript-node",
  "typescript-node",
  "java-jdk",
  "c-gcc",
  "cpp-gcc",
  "c-clang",
  "cpp-clang",
  "cs-core", // C# (.NET Core)
  "cs-mono", // C# (Mono C# compiler)
  "swift",
  "golang",
  "ruby",
  "php",
  "rust",
  "kotlin",
  "scala",
  "bash",
  "powershell",
  "perl",
  "lua",
  "haskell-ghc",
  "clojure",
  "r", // R
  "apl-dyalog", // APL (Dyalog Unicode)
  "fsharp-core", // F# (.NET Core)
  "ocaml",
  "dart",
  "elixir",
  "erlang-escript", // Erlang
  "sql-sqlite", // SQLite for SQL
  // Add more common IDs here if desired
]);

// Implements TIO's saveState logic for ##SINGLE_B64_PAYLOAD URLs
function generateTioUrl({
  languageId,
  code,
  header = "",
  footer = "",
  inputStr = "",
  argsStr = "",
  settingsString = "", // Assuming this is the direct content part of settings
}: CommandFormValues): string {
  let stateString = textToBinaryString(languageId);
  stateString += FIELD_SEPARATOR + textToBinaryString(header);
  stateString += FIELD_SEPARATOR + textToBinaryString(code);
  stateString += FIELD_SEPARATOR + textToBinaryString(footer);
  stateString += FIELD_SEPARATOR + textToBinaryString(inputStr);

  // Arguments (mimicking part of TIO's extra field block)
  if (argsStr && argsStr.trim().length > 0) {
    const argsArray = argsStr
      .trim()
      .split(" ")
      .filter((arg) => arg.length > 0);
    if (argsArray.length > 0) {
      stateString += START_OF_EXTRA_FIELDS + "args"; // Field name for args
      argsArray.forEach((arg) => {
        stateString += FIELD_SEPARATOR + textToBinaryString(arg);
      });
    }
  }

  // Settings (simplified: assuming settingsString is the direct content after \xf5)
  if (settingsString && settingsString.trim().length > 0) {
    stateString += START_OF_SETTINGS + textToBinaryString(settingsString.trim());
  }

  // Deflate the entire state string
  const compressed_state_bytes = pako.deflateRaw(byteStringToByteArray(stateString), { level: 9 });
  const b64_full_state = tioSafeBase64Encode(byteArrayToByteString(compressed_state_bytes));

  console.log("[Debug] Generated stateString before compression:", JSON.stringify(stateString));
  console.log("[Debug] b64_full_state:", b64_full_state);

  return `https://tio.run/##${b64_full_state}`;
}

// useEffect-based Command component (Comment out or remove to enable FormCommand)
/*
export default function Command() {
    useEffect(() => {
        const executeHardcodedLogic = async () => {
            const hardcodedValues: CommandFormValues = {
                languageId: "python3",
                code: "print(\"Hello, World!\")", // Hello World code
                header: "", 
                footer: "", 
                inputStr: "", 
                argsStr: "", 
                settingsString: ""
            };
            try {
                // To see the logs, you might need to check Raycast's developer tools console
                // or the terminal output if Raycast forwards extension console.logs there.
                console.log("--- generateTioUrl call START ---");
                const tioUrl = generateTioUrl(hardcodedValues);
                console.log("--- generateTioUrl call END ---");
                // console.log("[Debug] Generated stateString before compression:", JSON.stringify(stateString)); // Already in generateTioUrl
                // console.log("[Debug] b64_full_state:", b64_full_state); // Already in generateTioUrl
                console.log("Generated URL (Single Payload TIO Model):", tioUrl);
                // Restore a relevant target for comparison if needed, or remove.
                // console.log("Target URL for comparison: https://tio.run/##K6gsycjPM/7/v6AoM69EQ8kjNScnX0chPL8oJ0VRSfP/fwA");

                await Clipboard.copy(tioUrl);
                await showToast(Toast.Style.Success, "TIO URL Copied (Single Payload)", tioUrl.length < 80 ? tioUrl : tioUrl.substring(0, 77) + "...");
            } catch (error) {
                console.error("Error in executeHardcodedLogic:", error);
                await showToast(Toast.Style.Failure, "Failed (Single Payload)", error instanceof Error ? error.message : String(error));
            }
        };
        executeHardcodedLogic();
    }, []);
    return null;
}
*/

// To restore the Form:
// 1. Delete or rename the Command() function above.
// 2. Uncomment the FormCommand function below.
// 3. Rename FormCommand to "Command" as the default export.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function FormCommand(_props: LaunchProps) {
  // Renamed to export default Command
  const [allParsedLanguages, setAllParsedLanguages] = useState<Array<{ id: string; name: string }>>([]);
  const [tioSupportedLanguages, setTioSupportedLanguages] = useState<Array<{ id: string; name: string }>>([]);
  const [languageLoadError, setLanguageLoadError] = useState<string | null>(null);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState<boolean>(true);
  const [showAllLanguages, setShowAllLanguages] = useState<boolean>(false);

  const [languageId, setLanguageId] = useState<string>(""); // Default to empty, will update after load
  const [code, setCode] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [header, _setHeader] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [footer, _setFooter] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [inputStr, _setInputStr] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [argsStr, _setArgsStr] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [settingsString, _setSettingsString] = useState<string>("");

  // Determine which command is running
  // const commandName = props.launchContext?.commandName || "generate-tio-url";

  useEffect(() => {
    async function loadLanguages() {
      setIsLoadingLanguages(true);
      setLanguageLoadError(null);
      try {
        const languagesPath = path.join(environment.assetsPath, "languages.json");
        const fileContent = await fs.readFile(languagesPath, "utf-8");
        const languagesData = JSON.parse(fileContent);

        const loaded: Array<{ id: string; name: string }> = [];
        for (const langId in languagesData) {
          if (Object.prototype.hasOwnProperty.call(languagesData, langId)) {
            loaded.push({ id: langId, name: languagesData[langId].name || langId });
          }
        }
        loaded.sort((a, b) => a.name.localeCompare(b.name));
        setAllParsedLanguages(loaded); // Store all loaded and sorted languages

        // Initial population of tioSupportedLanguages will be handled by the next useEffect
        // based on the initial state of showAllLanguages (false)
      } catch (error) {
        console.error("Failed to load or parse languages.json:", error);
        setLanguageLoadError("Failed to load languages. Check console for details.");
        setAllParsedLanguages([]); // Ensure it's an empty array on error
        await showToast(Toast.Style.Failure, "Error Loading Languages", "Could not load languages.json from assets.");
      } finally {
        setIsLoadingLanguages(false);
      }
    }
    loadLanguages();
  }, []);

  // Effect to update the displayed languages when allParsedLanguages or showAllLanguages changes
  useEffect(() => {
    if (isLoadingLanguages) return; // Don't do anything if still loading the main list

    let displayList: Array<{ id: string; name: string }> = [];
    if (showAllLanguages) {
      displayList = allParsedLanguages;
    } else {
      displayList = allParsedLanguages.filter((lang) => COMMON_LANGUAGE_IDS.has(lang.id));
    }

    // Re-sort, especially if the common list isn't inherently sorted by name
    // (though allParsedLanguages already is, filtering might mess order if COMMON_LANGUAGE_IDS isn't alpha)
    // For safety and consistency, sort the final display list.
    displayList.sort((a, b) => a.name.localeCompare(b.name));
    setTioSupportedLanguages(displayList);

    // Update selected languageId
    if (displayList.length > 0) {
      const currentLangStillExists = displayList.some((l) => l.id === languageId);
      if (languageId && currentLangStillExists) {
        // Keep current selection if it's still in the new list
        setLanguageId(languageId);
      } else {
        // Default to python3 if present, otherwise the first in the new list
        const python3 = displayList.find((l) => l.id === "python3");
        setLanguageId(python3 ? python3.id : displayList[0].id);
      }
    } else {
      setLanguageId(""); // No languages to select
      if (!showAllLanguages && allParsedLanguages.length > 0) {
        // only show warning if filtering resulted in empty
        showToast(
          Toast.Style.Failure,
          "No Common Languages Found",
          "The curated list might be empty or misconfigured."
        );
      }
    }
  }, [allParsedLanguages, showAllLanguages, isLoadingLanguages, languageId]);

  async function handleSubmit(values: CommandFormValues, action: "copy" | "open" = "copy") {
    if (!values.languageId) {
      await showToast(Toast.Style.Failure, "Language ID is required");
      return;
    }
    if (!values.code) {
      await showToast(Toast.Style.Failure, "Code is required");
      return;
    }

    try {
      const tioUrl = generateTioUrl(values);
      if (action === "open") {
        await open(tioUrl);
        await showToast(
          Toast.Style.Success,
          "TIO URL Opened!",
          tioUrl.length < 80 ? tioUrl : tioUrl.substring(0, 77) + "..."
        );
      } else {
        await Clipboard.copy(tioUrl);
        await showToast(
          Toast.Style.Success,
          "TIO URL Copied!",
          tioUrl.length < 80 ? tioUrl : tioUrl.substring(0, 77) + "..."
        );
      }
    } catch (error) {
      console.error("Error generating TIO URL:", error);
      await showToast(
        Toast.Style.Failure,
        "Failed to generate URL",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate and Copy URL"
            onSubmit={(values) => handleSubmit(values as CommandFormValues, "copy")}
          />
          <Action
            title="Open Tio URL in Browser"
            onAction={async () => {
              await handleSubmit(
                {
                  languageId,
                  code,
                  header,
                  footer,
                  inputStr,
                  argsStr,
                  settingsString,
                },
                "open"
              );
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="languageId"
        title="Language"
        value={languageId}
        onChange={setLanguageId}
        storeValue // Remember the last selected language
      >
        {isLoadingLanguages ? (
          <Form.Dropdown.Item value="" title="Loading languages..." />
        ) : languageLoadError ? (
          <Form.Dropdown.Item value="" title={languageLoadError} />
        ) : (
          tioSupportedLanguages.map((lang) => <Form.Dropdown.Item key={lang.id} value={lang.id} title={lang.name} />)
        )}
      </Form.Dropdown>
      <Form.Checkbox
        id="showAllLanguages"
        label="Show all available languages"
        value={showAllLanguages}
        onChange={setShowAllLanguages}
      />
      <Form.TextArea id="code" title="Code" value={code} onChange={setCode} placeholder="Enter your code here" />
      <Form.TextArea
        id="header"
        title="Header"
        placeholder="Optional: Code to prepend (e.g. includes, using statements)"
      />
      <Form.TextArea id="footer" title="Footer Code (Optional)" placeholder="Code to append" enableMarkdown={false} />
      <Form.TextArea
        id="inputStr"
        title="Stdin Input (Optional)"
        placeholder="Input for your program"
        enableMarkdown={false}
      />
      <Form.TextField id="argsStr" title="Command-line Arguments (Optional)" placeholder="Space-separated arguments" />
      <Form.TextArea
        id="settingsString"
        title="TIO Settings String (Optional)"
        placeholder="Advanced: raw settings string (e.g., Vdebug=true)"
        enableMarkdown={false}
      />
    </Form>
  );
}
