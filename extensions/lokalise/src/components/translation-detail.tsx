import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { client } from "../api/client";
import { getLanguageName } from "../data/languages";

interface TranslationDetailProps {
  keyId: number;
}

export function TranslationDetail({ keyId }: TranslationDetailProps) {
  const { data: keyToDisplay, isLoading } = useCachedPromise(
    async (id: number) => {
      const key = await client.getKey(id);
      return client.processKey(key, getLanguageName);
    },
    [keyId],
  );

  if (!keyToDisplay) {
    return <Detail isLoading={isLoading} />;
  }
  const screenshotMarkdown =
    keyToDisplay.screenshots.length > 0
      ? `${keyToDisplay.screenshots.map((s) => `![${s.title}](${s.url})`).join("\n\n")}`
      : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={screenshotMarkdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Key Name" text={keyToDisplay.keyName} />
          {keyToDisplay.defaultTranslation && (
            <Detail.Metadata.Label title="Default Translation" text={keyToDisplay.defaultTranslation} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Platforms" text={keyToDisplay.platforms.join(", ") || "N/A"} />
          <Detail.Metadata.Label title="Is Plural" text={keyToDisplay.isPlural ? "Yes" : "No"} />
          <Detail.Metadata.Label title="Tags" text={keyToDisplay.tags.join(", ") || "None"} />
          {keyToDisplay.description && <Detail.Metadata.Label title="Description" text={keyToDisplay.description} />}
          {keyToDisplay.context && <Detail.Metadata.Label title="Context" text={keyToDisplay.context} />}
          {keyToDisplay.translations.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Translations" />
              {keyToDisplay.translations.map((trans, index) => (
                <Detail.Metadata.Label key={index} title={trans.languageName} text={trans.text} />
              ))}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Key Name" content={keyToDisplay.keyName} />
          {keyToDisplay.mainTranslation && (
            <Action.CopyToClipboard title="Copy Translation" content={keyToDisplay.mainTranslation} />
          )}
          {keyToDisplay.screenshots.length > 0 && (
            <>
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
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
