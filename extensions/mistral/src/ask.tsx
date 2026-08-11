import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { ClipboardSelector } from "./components/clipboard-selector";
import { Conversation } from "./components/conversation";
import { useClipboardHistory } from "./hooks/use-clipboard-history";
import { DEFAULT_MODEL_ID, FALLBACK_MODELS, getDefaultVisionModel, supportsVision, type ModelId } from "./utils/models";

export default function Command() {
  const { push } = useNavigation();
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL_ID);
  const [question, setQuestion] = useState("");
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const { clipboardItems } = useClipboardHistory();

  const hasImages = imagePaths.length > 0;
  const needsVision = hasImages && !supportsVision(model);
  const effectiveModel = needsVision ? getDefaultVisionModel() : model;

  const modelName = FALLBACK_MODELS.find((m) => m.id === model)?.name || "Unknown";
  const effectiveModelName = FALLBACK_MODELS.find((m) => m.id === effectiveModel)?.name || "Unknown";

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
          const { getMimeTypeFromExtension } = await import("./utils/image-formats");
          const fs = await import("fs/promises");

          const ext = (imagePaths[0].toLowerCase().split(".").pop() || "").toLowerCase();
          const mimeType = getMimeTypeFromExtension(ext) || "image/png";

          const imageBuffer = await fs.readFile(imagePaths[0]);
          const base64 = imageBuffer.toString("base64");
          const dataUrl = `data:${mimeType};base64,${base64}`;

          setImagePreviewData(dataUrl);
        } catch {
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
            <ClipboardSelector
              clipboardItems={clipboardItems}
              onSelectImage={(filePath) => setImagePaths([filePath])}
              onSelectText={(text) => setQuestion(text)}
            />
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
