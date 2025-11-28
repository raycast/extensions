import { Action, ActionPanel, List, showToast, Toast, getSelectedFinderItems, Icon, environment } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";

import { createFont, woff2, FontEditor } from "fonteditor-core";

type FontFormat = "ttf" | "woff" | "woff2" | "eot" | "svg";

const FORMATS: FontFormat[] = ["ttf", "woff", "woff2", "eot", "svg"];

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
      const buffer = fs.readFileSync(selectedFile);
      const ext = path.extname(selectedFile).slice(1).toLowerCase();

      // Initialize woff2 if needed (either for input or output)
      if (ext === "woff2" || targetFormat === "woff2") {
        const wasmSource = path.join(environment.assetsPath, "woff2.wasm");
        // fonteditor-core expects woff2.wasm in the same directory as the script in Node
        const wasmDest = path.join(path.dirname(__filename), "woff2.wasm");

        if (!fs.existsSync(wasmDest)) {
          fs.copyFileSync(wasmSource, wasmDest);
        }

        await woff2.init();
      }

      const font = createFont(buffer, {
        type: ext as FontEditor.FontType,
        hinting: true,
        kerning: true,
      });

      const outputBuffer = font.write({
        type: targetFormat,
      });

      const dir = path.dirname(selectedFile);
      const name = path.basename(selectedFile, path.extname(selectedFile));
      const outputPath = path.join(dir, `${name}.${targetFormat}`);

      fs.writeFileSync(outputPath, Buffer.from(outputBuffer as Buffer));

      toast.style = Toast.Style.Success;
      toast.title = "Conversion successful";
      toast.message = `Saved to ${path.basename(outputPath)}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Conversion failed";
      toast.message = error instanceof Error ? error.message : String(error);
      console.error(error);
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
