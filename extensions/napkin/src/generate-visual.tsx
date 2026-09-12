import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Detail,
  useNavigation,
  getPreferenceValues,
  showInFinder,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { createVisualRequest, pollForCompletion, downloadFile } from "./utils/napkin-api";
import { GeneratedFile } from "./utils/types";
import { STYLES, LANGUAGES, FORMATS, COLOR_MODES, TEXT_EXTRACTION_MODES, SORT_STRATEGIES } from "./utils/constants";
import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir, tmpdir } from "os";

interface FormValues {
  content: string;
  style_id: string;
  language: string;
  format: "png" | "svg" | "ppt";
  transparent_background: boolean;
  color_mode: "light" | "dark" | "both";
  visual_query: string;
  text_extraction_mode: "auto" | "rewrite" | "preserve";
  sort_strategy: "relevance" | "variation" | "random";
}

interface VisualResultProps {
  files: GeneratedFile[];
  format: "png" | "svg";
  colorMode: "light" | "dark" | "both";
}

function getSavePath(): string {
  const preferences = getPreferenceValues<Preferences>();
  const defaultPath = join(homedir(), "Downloads");

  if (preferences.savePath && existsSync(preferences.savePath)) {
    return preferences.savePath;
  }

  return defaultPath;
}

function VisualResult({ files, format, colorMode }: VisualResultProps) {
  const [imageDataList, setImageDataList] = useState<string[]>([]);
  const [downloadCache, setDownloadCache] = useState<Map<string, ArrayBuffer>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const mimeType = format === "svg" ? "image/svg+xml" : "image/png";
        const dataList: string[] = [];
        const cache = new Map<string, ArrayBuffer>();

        for (const file of files) {
          const data = await downloadFile(file.url);
          cache.set(file.url, data);
          const base64 = Buffer.from(data).toString("base64");
          dataList.push(`data:${mimeType};base64,${base64}`);
        }

        setDownloadCache(cache);
        setImageDataList(dataList);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load image",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function getFileData(url: string): Promise<ArrayBuffer> {
    const cached = downloadCache.get(url);
    if (cached) return cached;
    return downloadFile(url);
  }

  async function saveFile(index: number, suffix: string) {
    try {
      const file = files[index];
      const data = await getFileData(file.url);
      const fileName = `napkin-visual-${suffix}-${Date.now()}.${format}`;
      const filePath = join(getSavePath(), fileName);
      writeFileSync(filePath, Buffer.from(data));
      await showToast({
        style: Toast.Style.Success,
        title: "Saved!",
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(filePath),
        },
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: String(error),
      });
    }
  }

  async function saveAll() {
    try {
      const suffixes = colorMode === "both" ? ["light", "dark"] : [colorMode];
      const savedPaths: string[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await getFileData(file.url);
        const fileName = `napkin-visual-${suffixes[i] || "visual"}-${timestamp}-${i}.${format}`;
        const filePath = join(getSavePath(), fileName);
        writeFileSync(filePath, Buffer.from(data));
        savedPaths.push(filePath);
      }

      await showToast({
        style: Toast.Style.Success,
        title: `Saved ${savedPaths.length} file${savedPaths.length > 1 ? "s" : ""}!`,
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(savedPaths[0]),
        },
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: String(error),
      });
    }
  }

  async function copyToClipboard(index: number) {
    try {
      const file = files[index];
      const data = await getFileData(file.url);
      const tmpPath = join(tmpdir(), `napkin-temp-${Date.now()}.${format}`);
      writeFileSync(tmpPath, Buffer.from(data));
      await Clipboard.copy({ file: tmpPath });
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard!",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy",
        message: String(error),
      });
    }
  }

  let markdown = "Loading...";
  if (imageDataList.length > 0) {
    if (colorMode === "both" && imageDataList.length >= 2) {
      markdown = `## Light Mode\n![Light](${imageDataList[0]})\n\n---\n\n## Dark Mode\n![Dark](${imageDataList[1]})`;
    } else {
      markdown = `![Generated Visual](${imageDataList[0]})`;
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {imageDataList.length > 0 && colorMode === "both" && imageDataList.length >= 2 && (
            <>
              <Action
                title="Save Light Image"
                onAction={() => saveFile(0, "light")}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "s" }, Windows: { modifiers: ["ctrl"], key: "s" } }}
              />
              <Action
                title="Save Dark Image"
                onAction={() => saveFile(1, "dark")}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "s" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                }}
              />
              <Action
                title="Save Both Images"
                onAction={saveAll}
                shortcut={{
                  macOS: { modifiers: ["cmd", "opt"], key: "s" },
                  Windows: { modifiers: ["ctrl", "opt"], key: "s" },
                }}
              />
              <Action
                title="Copy Light Image"
                onAction={() => copyToClipboard(0)}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
              />
              <Action
                title="Copy Dark Image"
                onAction={() => copyToClipboard(1)}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "c" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                }}
              />
            </>
          )}
          {imageDataList.length > 0 && colorMode !== "both" && (
            <>
              <Action
                title="Save Image"
                onAction={() => saveFile(0, colorMode)}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "s" }, Windows: { modifiers: ["ctrl"], key: "s" } }}
              />
              <Action
                title="Copy Image"
                onAction={() => copyToClipboard(0)}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "c" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (!values.content.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Content is required",
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating visual...",
    });

    try {
      const { id } = await createVisualRequest({
        content: values.content,
        format: values.format,
        style_id: values.style_id,
        language: values.language,
        transparent_background: values.transparent_background,
        color_mode: values.color_mode,
        visual_query: values.visual_query || undefined,
        text_extraction_mode: values.text_extraction_mode,
        sort_strategy: values.sort_strategy,
      });

      const status = await pollForCompletion(id, () => {
        toast.message = "Still processing...";
      });

      if (status.generated_files && status.generated_files.length > 0) {
        // PPT: save directly without preview
        if (values.format === "ppt") {
          const file = status.generated_files[0];
          const data = await downloadFile(file.url);
          const fileName = `napkin-visual-${Date.now()}.pptx`;
          const filePath = join(getSavePath(), fileName);
          writeFileSync(filePath, Buffer.from(data));

          toast.style = Toast.Style.Success;
          toast.title = "PowerPoint saved!";
          toast.primaryAction = {
            title: "Show in Finder",
            onAction: () => showInFinder(filePath),
          };
        } else {
          // PNG/SVG: show preview
          toast.style = Toast.Style.Success;
          toast.title = "Visual generated!";
          push(<VisualResult files={status.generated_files} format={values.format} colorMode={values.color_mode} />);
        }
      } else {
        throw new Error("No files were generated.");
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Generation Failed";
      toast.message = String(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Visual" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Content" placeholder="Enter the text you want to visualize..." />
      <Form.Dropdown id="format" title="Format" defaultValue="png" storeValue>
        {FORMATS.map((fmt) => (
          <Form.Dropdown.Item key={fmt.value} value={fmt.value} title={fmt.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="style_id" title="Style" storeValue info="Preview styles at https://api.napkin.ai/docs/styles">
        {STYLES.map((style) => (
          <Form.Dropdown.Item key={style.id} value={style.id} title={`${style.category} - ${style.name}`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="language" title="Language" defaultValue="en-US" storeValue>
        {LANGUAGES.map((lang) => (
          <Form.Dropdown.Item key={lang.value} value={lang.value} title={lang.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown id="color_mode" title="Color Mode" defaultValue="light" storeValue>
        {COLOR_MODES.map((mode) => (
          <Form.Dropdown.Item key={mode.value} value={mode.value} title={mode.name} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="transparent_background" label="Transparent Background" defaultValue={false} storeValue />
      <Form.TextField
        id="visual_query"
        title="Visual Type"
        placeholder="e.g., mindmap, flowchart, timeline (optional)"
        info="Optional. Leave empty and Napkin will auto-select the best layout for your content."
      />
      <Form.Dropdown
        id="text_extraction_mode"
        title="Extraction Mode"
        defaultValue="auto"
        storeValue
        info="Optional. auto: Automatically determine extraction method; rewrite: Optimize extracted text; preserve: Stay close to original text."
      >
        {TEXT_EXTRACTION_MODES.map((mode) => (
          <Form.Dropdown.Item key={mode.value} value={mode.value} title={mode.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="sort_strategy"
        title="Sort Strategy"
        defaultValue="relevance"
        storeValue
        info="Optional. relevance: Sort by relevance; variation: Diverse across sources; random: Randomize the order."
      >
        {SORT_STRATEGIES.map((strategy) => (
          <Form.Dropdown.Item key={strategy.value} value={strategy.value} title={strategy.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
