import { Action, ActionPanel, Clipboard, Detail, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { Conversation } from "./components/conversation";
import { DEFAULT_MODEL_ID, FALLBACK_MODELS, getDefaultVisionModel, supportsVision, type ModelId } from "./utils/models";

export default function Command() {
  const { push } = useNavigation();
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL_ID);
  const [question, setQuestion] = useState("");
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [clipboardItems, setClipboardItems] = useState<{ offset: number; type: "image" | "text"; content: string }[]>(
    [],
  );

  useEffect(() => {
    loadClipboardHistory();
  }, []);

  async function loadClipboardHistory() {
    const items: { offset: number; type: "image" | "text"; content: string }[] = [];
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".heic", ".heif"];

    for (let offset = 0; offset <= 5; offset++) {
      try {
        const clipboardContent = await Clipboard.read({ offset });

        if (clipboardContent.file) {
          try {
            const filePath = parseFileUrl(clipboardContent.file);
            const lastDot = filePath.lastIndexOf(".");
            const ext = lastDot !== -1 ? filePath.toLowerCase().slice(lastDot) : "";

            if (imageExtensions.includes(ext) || !ext) {
              items.push({ offset, type: "image", content: filePath });
            }
          } catch {
            continue;
          }
        }

        if (
          clipboardContent.text &&
          !items.find((i) => i.offset === offset) &&
          !clipboardContent.text?.startsWith("Image (")
        ) {
          const text = clipboardContent.text.slice(0, 100);
          items.push({ offset, type: "text", content: text });
        }
      } catch {
        continue;
      }
    }

    setClipboardItems(items);
  }

  const hasImages = imagePaths.length > 0;
  const needsVision = hasImages && !supportsVision(model);
  const effectiveModel = needsVision ? getDefaultVisionModel() : model;

  const modelName = FALLBACK_MODELS.find((m) => m.id === model)?.name || "Unknown";
  const effectiveModelName = FALLBACK_MODELS.find((m) => m.id === effectiveModel)?.name || "Unknown";

  function parseFileUrl(fileUrl: string): string {
    const url = new URL(fileUrl);
    return decodeURIComponent(url.pathname);
  }

  function selectClipboardItem(item: { type: "image" | "text"; content: string }) {
    if (item.type === "image") {
      setImagePaths([item.content]);
      showToast({ title: "Image selected from clipboard", style: Toast.Style.Success });
    } else {
      setQuestion(item.content);
      showToast({ title: "Text pasted from clipboard", style: Toast.Style.Success });
    }
  }

  async function previewImage() {
    if (imagePaths.length > 0) {
      const fs = await import("fs/promises");
      const imageBuffer = await fs.readFile(imagePaths[0]);
      const base64 = imageBuffer.toString("base64");
      const ext = imagePaths[0].toLowerCase().split(".").pop();
      const mimeType = ext === "png" ? "png" : ext === "jpg" || ext === "jpeg" ? "jpeg" : "png";
      const dataUrl = `data:image/${mimeType};base64,${base64}`;

      push(
        <Detail
          markdown={`![Preview](${dataUrl})`}
          navigationTitle={imagePaths[0].split("/").pop() || "Image Preview"}
        />,
      );
    }
  }

  function handleSubmit(values: { question: string; images: string[] }) {
    if (!values.question.length) return;

    push(
      <Conversation
        conversation={{
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: values.question,
          date: new Date().toISOString(),
          chats: [{ question: values.question, answer: "", images: values.images || [] }],
        }}
        model={effectiveModel}
      />,
    );
  }

  const [imagePreviewData, setImagePreviewData] = useState<string>("");

  useEffect(() => {
    async function loadImagePreview() {
      if (imagePaths.length > 0) {
        try {
          const fs = await import("fs/promises");
          const imageBuffer = await fs.readFile(imagePaths[0]);
          const base64 = imageBuffer.toString("base64");
          const ext = imagePaths[0].toLowerCase().split(".").pop();
          const mimeType = ext === "png" ? "png" : ext === "jpg" || ext === "jpeg" ? "jpeg" : "png";
          setImagePreviewData(`data:image/${mimeType};base64,${base64}`);
        } catch (error) {
          console.error("Failed to load image preview:", error);
          setImagePreviewData("");
        }
      } else {
        setImagePreviewData("");
      }
    }
    loadImagePreview();
  }, [imagePaths]);

  const previewMarkdown =
    hasImages && imagePreviewData
      ? `![Mistral AI](mistral-logo.png?raycast-width=80&raycast-height=80)\n\n## Selected Image\n\n![Preview](${imagePreviewData})\n\n---\n\n${needsVision ? `🖼️ Image detected - Using **${effectiveModelName}**` : `🖼️ Using **${effectiveModelName}**`}\n\n**Filename:** ${imagePaths[0].split("/").pop()}`
      : `![Mistral AI](mistral-logo.png?raycast-width=100&raycast-height=100)\n\n## Ask Mistral\n\n🤖 **${modelName}**\n\nType your question in the search bar above and press Enter to submit.${clipboardItems.length > 0 ? `\n\n💡 Press **Cmd+Shift+I** to select from clipboard` : ""}`;

  return (
    <List
      isShowingDetail
      navigationTitle="Ask Mistral"
      searchBarPlaceholder="Ask Mistral anything..."
      searchText={question}
      onSearchTextChange={setQuestion}
      filtering={false}
    >
      <List.Item
        title="Ask Question"
        icon={Icon.Message}
        detail={<List.Item.Detail markdown={previewMarkdown} />}
        actions={
          <ActionPanel>
            <Action
              title="Ask Mistral"
              icon={Icon.Message}
              onAction={() => handleSubmit({ question, images: imagePaths })}
            />
            <ActionPanel.Submenu
              title="Select from Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            >
              {clipboardItems.length > 0 ? (
                clipboardItems.map((item, index) => {
                  if (item.type === "image") {
                    const filename = item.content.split("/").pop() || "Unknown";
                    return (
                      <Action
                        key={item.offset}
                        title={`${filename}${index === 0 ? " (Latest)" : ""}`}
                        icon={{ source: item.content }}
                        onAction={() => selectClipboardItem(item)}
                      />
                    );
                  } else {
                    return (
                      <Action
                        key={item.offset}
                        title={`${item.content}${index === 0 ? " (Latest)" : ""}`}
                        icon={Icon.Text}
                        onAction={() => selectClipboardItem(item)}
                      />
                    );
                  }
                })
              ) : (
                <Action
                  title="No Items in Clipboard History"
                  icon={Icon.XMarkCircle}
                  onAction={() => showToast({ title: "No clipboard items found", style: Toast.Style.Failure })}
                />
              )}
            </ActionPanel.Submenu>
            {hasImages && (
              <Action
                title="Quick Look"
                icon={Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "y" }}
                onAction={previewImage}
              />
            )}
            <ActionPanel.Section title="🤖 Select Model">
              {FALLBACK_MODELS.map((m, index) => {
                const shortcutKey = index < 4 ? ((index + 1).toString() as "1" | "2" | "3" | "4") : undefined;
                return (
                  <Action
                    key={m.id}
                    title={m.name}
                    icon={model === m.id ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => setModel(m.id)}
                    shortcut={shortcutKey ? { modifiers: ["cmd", "shift"], key: shortcutKey } : undefined}
                  />
                );
              })}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    </List>
  );
}
