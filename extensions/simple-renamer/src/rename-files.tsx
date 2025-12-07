import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation, getSelectedFinderItems } from "@raycast/api";
import { useState, useEffect } from "react";
import { promises as fs, existsSync } from "fs";
import path from "path";
import { toCamelCase, toPascalCase, toKebabCase, toSnakeCase, toTitleCase, formatDate } from "./utils";

interface FileItem {
  path: string;
  name: string;
  directory: string;
  birthtime: Date;
  mtime: Date;
}

export default function RenameFiles() {
  const [mode, setMode] = useState<"replace" | "overwrite" | "case" | "sequence" | "prefix_suffix" | "remove" | "date">(
    "replace",
  );
  const [targetCase, setTargetCase] = useState("lowercase");
  const [useRegex, setUseRegex] = useState(false);
  const [matchPattern, setMatchPattern] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [startNumber, setStartNumber] = useState("1");
  const [sequencePosition, setSequencePosition] = useState<"prefix" | "suffix" | "template">("suffix");
  const [removeFirst, setRemoveFirst] = useState("0");
  const [removeLast, setRemoveLast] = useState("0");
  const [dateType, setDateType] = useState<"created" | "modified" | "today">("created");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [datePosition, setDatePosition] = useState<"prefix" | "suffix">("suffix");
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preview, setPreview] = useState<Array<{ original: string; new: string }>>([]);
  const [matchError, setMatchError] = useState<string | undefined>();
  const [collisionWarning, setCollisionWarning] = useState<string | undefined>();
  const { pop } = useNavigation();

  // Helper to generate regex pattern
  function getRegexPattern(input: string, isRegex: boolean): string {
    if (isRegex) return input;

    // Split by comma if present, treating as OR
    const parts = input.split(",");

    // Escape each part
    const escapedParts = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    // Join with |
    return escapedParts.join("|");
  }

  // Helper to apply renaming tokens
  function applyRenamePatterns(text: string, nameWithoutExt: string, index: number): string {
    let newText = text;
    // Replace $name
    newText = newText.replace(/\$name/g, nameWithoutExt);

    // Replace numeric padding tokens
    const paddingMatches = Array.from(new Set(newText.match(/#+/g) || [])).sort((a, b) => b.length - a.length);
    if (paddingMatches) {
      for (const match of paddingMatches) {
        const paddingLength = match.length;
        const paddedNumber = String(index).padStart(paddingLength, "0");
        newText = newText.replace(new RegExp(match.replace(/#/g, "\\#"), "g"), paddedNumber);
      }
    }
    return newText;
  }

  useEffect(() => {
    loadSelectedFiles();
  }, []);

  useEffect(() => {
    if (!matchPattern) {
      setMatchError(undefined);
      updatePreview();
      return;
    }

    // Only validate regex if we are actually using regex
    if (useRegex) {
      try {
        new RegExp(matchPattern);
        setMatchError(undefined);
      } catch {
        setMatchError("Invalid regular expression");
        setPreview([]);
        return;
      }
    }

    updatePreview();
  }, [
    matchPattern,
    renameTo,
    selectedFiles,
    mode,
    targetCase,
    useRegex,
    prefix,
    suffix,
    startNumber,
    removeFirst,
    removeLast,
    dateType,
    dateFormat,
    datePosition,
    sequencePosition,
  ]);

  async function loadSelectedFiles() {
    try {
      setIsLoading(true);
      const finderItems = await getSelectedFinderItems();
      const files: FileItem[] = [];

      for (const item of finderItems) {
        try {
          const stats = await fs.stat(item.path);
          // No need to check isFile() as getSelectedFinderItems already returns files
          files.push({
            path: item.path,
            name: path.basename(item.path),
            directory: path.dirname(item.path),
            birthtime: stats.birthtime,
            mtime: stats.mtime,
          });
        } catch {
          // Skip files that can't be accessed
        }
      }

      setSelectedFiles(files);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Please select files in Finder first",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function updatePreview() {
    if ((mode === "overwrite" && !renameTo) || selectedFiles.length === 0) {
      setPreview([]);
      return;
    }

    const filteredFiles = matchPattern
      ? selectedFiles.filter((file) => {
          try {
            const pattern = getRegexPattern(matchPattern, useRegex);
            const regex = new RegExp(pattern);
            return regex.test(file.name);
          } catch {
            return false;
          }
        })
      : selectedFiles;

    // Generate preview items and check for collisions
    const seenNames = new Set<string>();
    let internalCollisionCount = 0;
    let externalCollisionCount = 0;

    const previewItems = filteredFiles.map((file, index) => {
      const newName = generateNewName(file, renameTo, index + 1);
      const newPath = path.join(file.directory, newName);
      const isSameFile = file.path === newPath;

      // Check for internal collision (multiple files mapping to same name)
      if (seenNames.has(newPath)) {
        internalCollisionCount++;
      } else {
        seenNames.add(newPath);
      }

      // Check for external collision (file exists on disk)
      // Only check if it's not the file itself (case change or same file)
      // Note: We use synchronous existsSync for UI responsiveness in the effect loop
      if (!isSameFile && existsSync(newPath)) {
        // Double check not in our internal set (though internal set tracks *targets*, this tracks *existing on disk*)
        externalCollisionCount++;
      }

      return {
        original: file.name,
        new: newName,
      };
    });

    setPreview(previewItems);

    if (internalCollisionCount > 0) {
      setCollisionWarning(`⚠️ Warning: ${internalCollisionCount + 1} files will have the same name!`);
    } else if (externalCollisionCount > 0) {
      setCollisionWarning(`⚠️ Warning: ${externalCollisionCount} file(s) will overwrite existing files!`);
    } else {
      setCollisionWarning(undefined);
    }
  }

  function generateNewName(file: FileItem, patternReplacement: string, index: number): string {
    const originalName = file.name;
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);

    if (mode === "prefix_suffix") {
      return prefix + nameWithoutExt + suffix + ext;
    }

    if (mode === "remove") {
      const first = parseInt(removeFirst) || 0;
      const last = parseInt(removeLast) || 0;
      let newName = nameWithoutExt;
      if (first > 0) newName = newName.slice(first);
      if (last > 0) newName = newName.slice(0, Math.max(0, newName.length - last));
      return newName + ext;
    }

    if (mode === "date") {
      let date: Date;
      if (dateType === "today") date = new Date();
      else if (dateType === "modified") date = file.mtime;
      else date = file.birthtime; // created

      const dateStr = formatDate(date, dateFormat);
      if (datePosition === "prefix") return dateStr + nameWithoutExt + ext;
      return nameWithoutExt + dateStr + ext;
    }

    if (mode === "sequence") {
      const pattern =
        patternReplacement ||
        (sequencePosition === "template" ? "File-##" : sequencePosition === "suffix" ? "-##" : "##-");
      const start = parseInt(startNumber) || 1;
      const currentIndex = start + index - 1;

      // Handle "template" mode (full replacement with tokens)
      if (sequencePosition === "template") {
        return applyRenamePatterns(pattern, nameWithoutExt, currentIndex);
      }

      // Handle prefix/suffix mode (add to existing name)
      // 1. Generate the number string from the pattern (e.g. "_##" -> "_01")
      // We use applyRenamePatterns with an empty "name" since we just want the numbers/text, not $name substitution (unless user explicitly wants it)
      const numberPart = applyRenamePatterns(pattern, "", currentIndex);

      if (sequencePosition === "prefix") {
        return numberPart + nameWithoutExt + ext;
      } else {
        return nameWithoutExt + numberPart + ext;
      }
    }

    if (mode === "case") {
      let newName = nameWithoutExt;
      switch (targetCase) {
        case "lowercase":
          newName = newName.toLowerCase();
          break;
        case "uppercase":
          newName = newName.toUpperCase();
          break;
        case "camel":
          newName = toCamelCase(newName);
          break;
        case "pascal":
          newName = toPascalCase(newName);
          break;
        case "snake":
          newName = toSnakeCase(newName);
          break;
        case "kebab":
          newName = toKebabCase(newName);
          break;
        case "title":
          newName = toTitleCase(newName);
          break;
      }
      return newName + ext;
    }

    if (mode === "replace") {
      // Process tokens in replacement string first
      const processedReplacement = applyRenamePatterns(patternReplacement, nameWithoutExt, index);

      if (!matchPattern) return processedReplacement + ext; // Full rename if find is empty

      // Find & Replace Mode
      try {
        const pattern = getRegexPattern(matchPattern, useRegex);
        const regex = new RegExp(pattern, "g"); // Global replace
        return originalName.replace(regex, processedReplacement);
      } catch {
        return originalName; // Should be handled by validation, but fallback
      }
    }

    // Overwrite Mode (Existing Logic)
    let newName = patternReplacement;
    newName = applyRenamePatterns(newName, nameWithoutExt, index);

    // Add extension if not already present
    if (!newName.includes(".") && ext) {
      newName = newName + ext;
    }

    if (!newName || newName === "." || (ext && newName === ext)) {
      throw new Error("Invalid filename");
    }

    return newName;
  }

  async function handleRename() {
    if (mode === "overwrite" && !renameTo) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rename pattern required",
        message: "Please enter a 'Rename To' pattern",
      });
      return;
    }

    if (selectedFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Please select files in Finder first",
      });
      return;
    }

    if (matchError) return;
    const filteredFiles = matchPattern
      ? selectedFiles.filter((file) => {
          try {
            const pattern = getRegexPattern(matchPattern, useRegex);
            const regex = new RegExp(pattern);
            return regex.test(file.name);
          } catch {
            return false;
          }
        })
      : selectedFiles;

    if (filteredFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No matching files",
        message: "No files match the pattern",
      });
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    await showToast({
      style: Toast.Style.Animated,
      title: "Renaming files...",
    });

    for (let i = 0; i < filteredFiles.length; i++) {
      const file = filteredFiles[i];
      try {
        const newName = generateNewName(file, renameTo, i + 1);
        const newPath = path.join(file.directory, newName);

        // Check if target file already exists
        try {
          await fs.access(newPath);
          errorCount++;
          continue; // Skip if file already exists
        } catch {
          // File doesn't exist, proceed with rename
        }

        await fs.rename(file.path, newPath);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    if (errorCount > 0 && successCount === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rename failed",
        message: `Could not rename ${errorCount} file(s)`,
      });
    } else if (errorCount > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Partial success",
        message: `Renamed ${successCount} file(s), ${errorCount} failed`,
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: "Files renamed",
        message: `Successfully renamed ${successCount} file(s)`,
      });
      pop();
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Rename Files"
            icon={Icon.Checkmark}
            onAction={handleRename}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Reload Selected Files"
            icon={Icon.ArrowClockwise}
            onAction={loadSelectedFiles}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Selected Files"
        text={
          selectedFiles.length > 0
            ? `${selectedFiles.length} file(s) selected`
            : "No files selected. Please select files in Finder first."
        }
      />

      <Form.Dropdown
        id="mode"
        title="Mode"
        value={mode}
        onChange={(newValue) =>
          setMode(newValue as "replace" | "overwrite" | "case" | "sequence" | "prefix_suffix" | "remove" | "date")
        }
      >
        <Form.Dropdown.Item value="replace" title="Find & Replace" />
        <Form.Dropdown.Item value="sequence" title="Sequential Numbers" />
        <Form.Dropdown.Item value="prefix_suffix" title="Add Prefix/Suffix" />
        <Form.Dropdown.Item value="case" title="Change Case" />
        <Form.Dropdown.Item value="remove" title="Remove Characters" />
        <Form.Dropdown.Item value="date" title="Add Date" />
        <Form.Dropdown.Item value="overwrite" title="Overwrite (Template)" />
      </Form.Dropdown>

      <Form.TextField
        id="match"
        title={mode === "replace" ? "Find" : "Match (Filter)"}
        placeholder={
          mode === "replace" ? (useRegex ? "Text to find (Regex)" : "Text to find") : "e.g., photo, .jpg, ^IMG"
        }
        value={matchPattern}
        onChange={setMatchPattern}
        error={matchError}
        info={
          useRegex
            ? "Regex supported. Invalid regex will disable actions."
            : "Use commas to separate multiple items (e.g. 'a,b'). Special chars auto-escaped."
        }
      />

      {mode === "replace" && (
        <Form.Checkbox id="useRegex" label="Use Regular Expressions" value={useRegex} onChange={setUseRegex} />
      )}

      {mode !== "case" && mode !== "sequence" && mode !== "prefix_suffix" && mode !== "remove" && mode !== "date" && (
        <Form.TextField
          id="renameTo"
          title={mode === "replace" ? "Replace With" : "Rename Pattern"}
          placeholder={mode === "replace" ? "New text" : "e.g., $name_##"}
          value={renameTo}
          onChange={setRenameTo}
          info={
            mode === "replace"
              ? "Text to replace the match with."
              : "Pattern for the new filename. Use tokens: $name, ##"
          }
        />
      )}

      {mode === "case" && (
        <Form.Dropdown id="targetCase" title="Target Case" value={targetCase} onChange={setTargetCase}>
          <Form.Dropdown.Item value="lowercase" title="lowercase" />
          <Form.Dropdown.Item value="uppercase" title="UPPERCASE" />
          <Form.Dropdown.Item value="title" title="Title Case" />
          <Form.Dropdown.Item value="camel" title="camelCase" />
          <Form.Dropdown.Item value="pascal" title="PascalCase" />
          <Form.Dropdown.Item value="snake" title="snake_case" />
          <Form.Dropdown.Item value="kebab" title="kebab-case" />
        </Form.Dropdown>
      )}

      {mode === "sequence" && (
        <>
          <Form.Dropdown
            id="sequencePosition"
            title="Position"
            value={sequencePosition}
            onChange={(v) => setSequencePosition(v as "prefix" | "suffix" | "template")}
          >
            <Form.Dropdown.Item value="suffix" title="Suffix (Append)" />
            <Form.Dropdown.Item value="prefix" title="Prefix (Prepend)" />
            <Form.Dropdown.Item value="template" title="Custom Template (Replace)" />
          </Form.Dropdown>
          <Form.TextField
            id="renameTo"
            title="Format"
            placeholder={sequencePosition === "suffix" ? "_##" : sequencePosition === "prefix" ? "##_" : "File-##"}
            value={renameTo}
            onChange={setRenameTo}
            info="Use ## for numbers. e.g. '_##' -> '_01'"
          />
          <Form.TextField
            id="startNumber"
            title="Start Number"
            placeholder="1"
            value={startNumber}
            onChange={setStartNumber}
          />
        </>
      )}

      {mode === "prefix_suffix" && (
        <>
          <Form.TextField
            id="prefix"
            title="Prefix"
            placeholder="Text to add at start"
            value={prefix}
            onChange={setPrefix}
          />
          <Form.TextField
            id="suffix"
            title="Suffix"
            placeholder="Text to add at end"
            value={suffix}
            onChange={setSuffix}
          />
        </>
      )}

      {mode === "remove" && (
        <>
          <Form.TextField
            id="removeFirst"
            title="Remove First N"
            placeholder="0"
            value={removeFirst}
            onChange={setRemoveFirst}
          />
          <Form.TextField
            id="removeLast"
            title="Remove Last N"
            placeholder="0"
            value={removeLast}
            onChange={setRemoveLast}
          />
        </>
      )}

      {mode === "date" && (
        <>
          <Form.Dropdown
            id="dateType"
            title="Date Type"
            value={dateType}
            onChange={(v) => setDateType(v as "created" | "modified" | "today")}
          >
            <Form.Dropdown.Item value="created" title="Date Created" />
            <Form.Dropdown.Item value="modified" title="Date Modified" />
            <Form.Dropdown.Item value="today" title="Today's Date" />
          </Form.Dropdown>
          <Form.TextField
            id="dateFormat"
            title="Format"
            placeholder="YYYY-MM-DD"
            value={dateFormat}
            onChange={setDateFormat}
            info="Format: YYYY, MM, DD, HH, mm, ss"
          />
          <Form.Dropdown
            id="datePosition"
            title="Position"
            value={datePosition}
            onChange={(v) => setDatePosition(v as "prefix" | "suffix")}
          >
            <Form.Dropdown.Item value="suffix" title="Suffix (End)" />
            <Form.Dropdown.Item value="prefix" title="Prefix (Start)" />
          </Form.Dropdown>
        </>
      )}

      {mode === "overwrite" && (
        <Form.Dropdown
          id="addToken"
          title="Add Token"
          onChange={(newValue) => {
            if (newValue) {
              setRenameTo((prev) => prev + newValue);
            }
          }}
          value=""
        >
          <Form.Dropdown.Item value="" title="Insert options..." />
          <Form.Dropdown.Item value="$name" title="Original Filename ($name)" />
          <Form.Dropdown.Item value="##" title="Number (2 digits) (##)" />
          <Form.Dropdown.Item value="###" title="Number (3 digits) (###)" />
          <Form.Dropdown.Item value="####" title="Number (4 digits) (####)" />
        </Form.Dropdown>
      )}

      {preview.length > 0 && (
        <>
          <Form.Separator />
          {collisionWarning && <Form.Description title="Warning" text={collisionWarning} />}
          <Form.Description title="Preview" text={`${preview.length} file(s) will be renamed: `} />
          {preview.slice(0, 1).map((item, index) => (
            <Form.Description key={index} title="" text={`${item.original} → ${item.new} `} />
          ))}
          {preview.length > 1 && <Form.Description title="" text={`... and ${preview.length - 1} more`} />}
        </>
      )}
    </Form>
  );
}
