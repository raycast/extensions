import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getKeyById } from "../api/database";

interface TranslationListItemDetailProps {
  keyId: number;
}

export function TranslationListItemDetail({ keyId }: TranslationListItemDetailProps) {
  const { data: keyDetails, isLoading } = useCachedPromise(
    async (id: number) => {
      return await getKeyById(id);
    },
    [keyId],
  );

  if (!keyDetails) {
    return <List.Item.Detail isLoading={isLoading} />;
  }

  const keyInfoMarkdown = `## ${keyDetails.keyName}\n\n${
    keyDetails.defaultTranslation ? `${keyDetails.defaultTranslation}\n\n` : ""
  }`;

  const screenshotsMarkdown =
    keyDetails.screenshots.length > 0
      ? `---\n\n${keyDetails.screenshots.map((s) => `![${s.title}](${s.url})`).join("\n\n")}`
      : "";

  const markdown = `${keyInfoMarkdown}${screenshotsMarkdown}`;

  const assignedFiles = keyDetails.filenames
    ? Object.entries(keyDetails.filenames).filter(([, filename]) => filename !== null && filename !== "")
    : [];

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Key Name" text={keyDetails.keyName} />
          {keyDetails.defaultTranslation && (
            <List.Item.Detail.Metadata.Label title="Default Translation" text={keyDetails.defaultTranslation} />
          )}
          {keyDetails.description && (
            <List.Item.Detail.Metadata.Label title="Description" text={keyDetails.description} />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Platforms" text={keyDetails.platforms.join(", ") || "N/A"} />
          <List.Item.Detail.Metadata.Label title="Is Plural" text={keyDetails.isPlural ? "Yes" : "No"} />
          <List.Item.Detail.Metadata.Label title="Tags" text={keyDetails.tags.join(", ") || "None"} />
          {keyDetails.context && <List.Item.Detail.Metadata.Label title="Context" text={keyDetails.context} />}
          {assignedFiles.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              {assignedFiles.map(([platform, filename]) => (
                <List.Item.Detail.Metadata.Label
                  key={platform}
                  title={`Assigned to File (${platform})`}
                  text={filename!}
                />
              ))}
            </>
          )}
          {keyDetails.translations.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              {keyDetails.translations.map((trans, index) => (
                <List.Item.Detail.Metadata.Label key={index} title={trans.languageName} text={trans.text} />
              ))}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function useTranslationDetails(keyId: number, enabled: boolean) {
  return useCachedPromise(
    async (id: number) => {
      return await getKeyById(id);
    },
    [keyId],
    {
      execute: enabled,
    },
  );
}
