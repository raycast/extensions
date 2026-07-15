import { Action, ActionPanel, List, showToast, Toast, getSelectedFinderItems, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";

import { createFont, FontEditor } from "fonteditor-core";
import fontverter from "fontverter";

type FontFormat = "ttf" | "woff" | "woff2" | "eot";

const FORMATS: FontFormat[] = ["ttf", "woff", "woff2", "eot"];

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSelectedFile() {
      try {
        const items = await getSelectedFinderItems();
        if (items.length === 0) {
          setError("No file selected in Finder");
          setIsLoading(false);
          return;
        }

        const filePath = items[0].path;
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) {
          setError("Selected item is not a file");
          setIsLoading(false);
          return;
        }

        const ext = path.extname(filePath).slice(1).toLowerCase();
        if (!["ttf", "woff", "woff2", "eot", "otf"].includes(ext)) {
          setError("Selected file is not a supported font format");
          setIsLoading(false);
          return;
        }

        setSelectedFile(filePath);
        setIsLoading(false);
      } catch (e) {
        setError("Could not get selected file");
        console.error(e);
        setIsLoading(false);
      }
    }

    fetchSelectedFile();
  }, []);

  async function handleConvert(targetFormat: FontFormat) {
    if (!selectedFile) return;

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Converting font...",
    });

    try {
      let buffer = fs.readFileSync(selectedFile);
      const ext = path.extname(selectedFile).slice(1).toLowerCase();
      const dir = path.dirname(selectedFile);
      const name = path.basename(selectedFile, path.extname(selectedFile));
      const outputPath = path.join(dir, `${name}.${targetFormat}`);

      if (ext === "woff2") {
        buffer = await fontverter.convert(buffer, "sfnt");
      }

      let outputBuffer: Buffer;
      if (targetFormat === "woff2") {
        let ttfBuffer: Buffer;
        if (ext === "woff2") {
          ttfBuffer = buffer;
        } else {
          const font = createFont(buffer, {
            type: ext as FontEditor.FontType,
            hinting: true,
            kerning: true,
          });
          ttfBuffer = Buffer.from(font.write({ type: "ttf" }) as Buffer);
        }
        outputBuffer = await fontverter.convert(ttfBuffer, "woff2");
      } else {
        const inputType = ext === "woff2" ? "ttf" : ext;
        const font = createFont(buffer, {
          type: inputType as FontEditor.FontType,
          hinting: true,
          kerning: true,
        });
        outputBuffer = Buffer.from(font.write({ type: targetFormat }) as Buffer);
      }

      fs.writeFileSync(outputPath, outputBuffer);
      toast.style = Toast.Style.Success;
      toast.title = "Conversion successful";
      toast.message = `Saved to ${path.basename(outputPath)}`;
    } catch (error) {
      await showFailureToast(error, { title: "Conversion failed" });
    } finally {
      setIsLoading(false);
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Error" description={error} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select output format...">
      {selectedFile && (
        <List.Section title={`Selected File: ${path.basename(selectedFile)}`}>
          {FORMATS.map((format) => (
            <List.Item
              key={format}
              title={`Convert to ${format.toUpperCase()}`}
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action title="Convert" onAction={() => handleConvert(format)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
