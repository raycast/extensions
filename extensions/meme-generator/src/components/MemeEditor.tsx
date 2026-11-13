import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ApiModule, Meme } from "../api/types";
import useDebouncedValue from "../hooks/useDebouncedValue";
import copyFileToClipboard from "../lib/copyFileToClipboard";
import MemeForm from "./MemeForm";
import MemePreview from "./MemePreview";

const INSTANT_PREVIEW_DEBOUNCE_MS = 200;
const API_PREVIEW_DEBOUNCE_MS = 500;

interface MemeEditorProps extends Meme {
  apiModule: ApiModule;
}

export default function MemeEditor({ id, title, url, boxCount, apiModule }: MemeEditorProps) {
  const [texts, setTexts] = useState<string[]>(() => Array<string>(boxCount).fill(""));
  const [activeBox, setActiveBox] = useState(0);
  const [capitalize, setCapitalize] = useState(true);
  const [isCopying, setIsCopying] = useState(false);

  const boxes = useMemo(
    () => texts.map((text) => ({ text: capitalize ? text.toUpperCase() : text })),
    [texts, capitalize],
  );

  const debouncedBoxes = useDebouncedValue(
    boxes,
    apiModule.previewUrl ? INSTANT_PREVIEW_DEBOUNCE_MS : API_PREVIEW_DEBOUNCE_MS,
  );
  const hasText = debouncedBoxes.some((box) => box.text.trim().length > 0);

  const instantPreviewUrl = apiModule.previewUrl && hasText ? apiModule.previewUrl({ id, boxes: debouncedBoxes }) : "";
  const shouldGeneratePreview = !apiModule.previewUrl && hasText;
  const {
    data: generatedPreviewUrl,
    isLoading: isGeneratingPreview,
    error: previewError,
  } = useCachedPromise(
    async (previewBoxes: { text: string }[]) => {
      try {
        return (await apiModule.generateMeme({ id, boxes: previewBoxes })).url;
      } catch (error) {
        throw new Error(errorMessage(error) ?? "Could not generate a preview");
      }
    },
    [debouncedBoxes],
    { execute: shouldGeneratePreview, keepPreviousData: true, failureToastOptions: { title: "Preview failed" } },
  );

  const previewUrl = instantPreviewUrl || (hasText ? generatedPreviewUrl : undefined) || url;
  const isPreviewPending = boxes !== debouncedBoxes || (shouldGeneratePreview && isGeneratingPreview);
  const previewHeight = boxCount > 1 ? 200 : 250;

  const markdown = useMemo(() => {
    if (previewError) {
      return `## Preview unavailable\n\n${errorMessage(previewError) ?? "Could not generate a preview."}`;
    }

    const image = `![${title}](${previewUrl}?raycast-height=${previewHeight})`;
    return hasText ? image : `${image}\n\nStart typing to see your meme update live.`;
  }, [previewError, previewUrl, title, hasText, previewHeight]);

  function onSearchTextChange(value: string) {
    setTexts((current) => current.map((text, index) => (index === activeBox ? value : text)));
  }

  function switchBox(offset: number) {
    setActiveBox((current) => (current + offset + boxCount) % boxCount);
  }

  async function onCopy() {
    if (!boxes.some((box) => box.text.trim().length > 0)) {
      await showToast({ style: Toast.Style.Failure, title: "At least one text input has to be filled" });
      return;
    }

    const generatingToast = await showToast({ style: Toast.Style.Animated, title: "Generating..." });
    setIsCopying(true);

    try {
      const { url: memeUrl } = await apiModule.generateMeme({ id, boxes });
      await copyFileToClipboard(memeUrl, `${title}.jpg`);
      await generatingToast.hide();
      await closeMainWindow();
      await showToast(Toast.Style.Success, `Meme "${title}" copied to clipboard`);
    } catch (error) {
      await generatingToast.hide();
      await showFailureToast(error, { title: "Could not generate the meme" });
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <List
      isShowingDetail
      filtering={false}
      isLoading={isCopying || isPreviewPending}
      navigationTitle={`Generate meme "${title}"`}
      searchText={texts[activeBox]}
      searchBarPlaceholder={
        boxCount > 1 ? `Text #${activeBox + 1} of ${boxCount} - ⌘↵ for the next one` : "Type the text for your meme"
      }
      onSearchTextChange={onSearchTextChange}
      searchBarAccessory={
        <List.Dropdown tooltip="Text Case" storeValue onChange={(value) => setCapitalize(value === "uppercase")}>
          <List.Dropdown.Item title="Uppercase" value="uppercase" />
          <List.Dropdown.Item title="As Typed" value="as-typed" />
        </List.Dropdown>
      }
    >
      <List.Item
        id="preview"
        icon={Icon.Image}
        title={boxCount > 1 ? `Text #${activeBox + 1}` : "Preview"}
        detail={
          <List.Item.Detail
            markdown={markdown}
            metadata={
              boxCount > 1 ? (
                <List.Item.Detail.Metadata>
                  {texts.map((text, index) => (
                    <List.Item.Detail.Metadata.Label
                      key={index}
                      icon={index === activeBox ? Icon.Pencil : Icon.Dot}
                      title={`Text #${index + 1}`}
                      text={text || "Empty"}
                    />
                  ))}
                </List.Item.Detail.Metadata>
              ) : undefined
            }
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action icon={Icon.Clipboard} title="Generate Meme" onAction={onCopy} />
              {boxCount > 1 && (
                <Action
                  icon={Icon.ArrowDown}
                  title="Next Text Box"
                  onAction={() => switchBox(1)}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
              )}
              {boxCount > 1 && (
                <Action
                  icon={Icon.ArrowUp}
                  title="Previous Text Box"
                  onAction={() => switchBox(-1)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.Push
                icon={Icon.Eye}
                title="Open Full Preview"
                target={<MemePreview title={title} url={previewUrl} />}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
              <Action.CopyToClipboard
                icon={Icon.Link}
                title="Copy Meme URL"
                content={previewUrl}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.Push
                icon={Icon.TextInput}
                title="Edit in Form"
                target={<MemeForm id={id} title={title} url={url} boxCount={boxCount} apiModule={apiModule} />}
                shortcut={Keyboard.Shortcut.Common.Edit}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    </List>
  );
}

function errorMessage(error: unknown): string | undefined {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return undefined;
}
