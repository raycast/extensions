import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getKeyById } from "../api/database";
import { DuplicateTranslationForm } from "./duplicate-translation-form";

interface TranslationDetailProps {
  keyId: number;
}

export function TranslationDetail({ keyId }: TranslationDetailProps) {
  const { data: keyToDisplay, isLoading } = useCachedPromise(
    async (id: number) => {
      return await getKeyById(id);
    },
    [keyId],
  );

  if (!keyToDisplay) {
    return <Detail isLoading={isLoading} />;
  }

  const keyInfoMarkdown = `## ${keyToDisplay.keyName}\n\n${
    keyToDisplay.defaultTranslation ? `${keyToDisplay.defaultTranslation}\n\n` : ""
  }`;

  const screenshotsMarkdown =
    keyToDisplay.screenshots.length > 0
      ? `---\n\n${keyToDisplay.screenshots.map((s) => `![${s.title}](${s.url})`).join("\n\n")}`
      : "";

  const markdown = `${keyInfoMarkdown}${screenshotsMarkdown}`;

  const assignedFiles = keyToDisplay.filenames
    ? Object.entries(keyToDisplay.filenames).filter(([, filename]) => filename !== null && filename !== "")
    : [];

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Key Name" text={keyToDisplay.keyName} />
          {keyToDisplay.defaultTranslation && (
            <Detail.Metadata.Label title="Default Translation" text={keyToDisplay.defaultTranslation} />
          )}
          {keyToDisplay.description && <Detail.Metadata.Label title="Description" text={keyToDisplay.description} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Platforms" text={keyToDisplay.platforms.join(", ") || "N/A"} />
          <Detail.Metadata.Label title="Is Plural" text={keyToDisplay.isPlural ? "Yes" : "No"} />
          <Detail.Metadata.Label title="Tags" text={keyToDisplay.tags.join(", ") || "None"} />
          {keyToDisplay.context && <Detail.Metadata.Label title="Context" text={keyToDisplay.context} />}
          {assignedFiles.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              {assignedFiles.map(([platform, filename]) => (
                <Detail.Metadata.Label key={platform} title={`Assigned to File (${platform})`} text={filename!} />
              ))}
            </>
          )}
          {keyToDisplay.translations.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              {keyToDisplay.translations.map((trans, index) => (
                <Detail.Metadata.Label key={index} title={trans.languageName} text={trans.text} />
              ))}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Key Name" content={keyToDisplay.keyName} />
            {keyToDisplay.mainTranslation && (
              <Action.CopyToClipboard title="Copy Translation" content={keyToDisplay.mainTranslation} />
            )}
            <Action.Push
              title="Duplicate Key"
              icon={Icon.Duplicate}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={<DuplicateTranslationForm keyData={keyToDisplay} />}
            />
          </ActionPanel.Section>
          {keyToDisplay.screenshots.length > 0 && (
            <ActionPanel.Section title="Screenshots">
              {keyToDisplay.screenshots.length === 1 ? (
                <Action.Open
                  title={`Open ${keyToDisplay.screenshots[0].title}`}
                  icon={Icon.Image}
                  target={keyToDisplay.screenshots[0].url}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              ) : (
                keyToDisplay.screenshots.map((screenshot, index) => (
                  <Action.Open
                    key={index}
                    title={`Open ${screenshot.title}`}
                    icon={Icon.Image}
                    target={screenshot.url}
                    shortcut={index === 0 ? { modifiers: ["cmd"], key: "s" } : undefined}
                  />
                ))
              )}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
