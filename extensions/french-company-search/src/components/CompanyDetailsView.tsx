import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { CompanyData } from "../types";
import { buildMarkdownAsync, markdownToHtml, markdownToPlainText } from "../lib/markdown-builder";
import { CompanyMetadata } from "./CompanyMetadata";
import { buildPappersSearchUrl } from "../lib/link-builder";

interface CompanyDetailsViewProps {
  data: CompanyData;
  templateOverride?: string;
}

async function generateLocalizedMarkdowns(companyData: CompanyData, templateOverride?: string) {
  const normalizedTemplate = templateOverride && templateOverride.trim().length > 0 ? templateOverride : undefined;

  const [fr, en] = await Promise.all([
    buildMarkdownAsync(companyData, {
      template: normalizedTemplate,
      language: "fr",
    }),
    buildMarkdownAsync(companyData, {
      template: normalizedTemplate,
      language: "en",
    }),
  ]);

  return { fr, en };
}

export function CompanyDetailsView({ data, templateOverride }: CompanyDetailsViewProps) {
  const { data: markdowns, isLoading } = usePromise(generateLocalizedMarkdowns, [data, templateOverride]);

  const frenchMarkdown =
    markdowns?.fr ||
    (isLoading ? "Loading company information..." : "Aucune information disponible pour cette société pour le moment.");
  const englishMarkdown = markdowns?.en ?? "";
  const englishSection = englishMarkdown ? `\n\n---\n\n**English Version**\n\n${englishMarkdown}` : "";
  const displayMarkdown = `${frenchMarkdown}${englishSection}`;

  const pappersUrl = buildPappersSearchUrl({
    siren: data.formality?.siren,
    denomination:
      data.formality.content.personneMorale?.denomination ??
      data.formality.content.personneMorale?.identite?.entreprise?.denomination ??
      null,
  });

  return (
    <Detail
      markdown={displayMarkdown}
      isLoading={isLoading}
      metadata={<CompanyMetadata data={data} />}
      actions={
        !isLoading ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy French Version"
              content={{
                html: markdownToHtml(frenchMarkdown),
                text: markdownToPlainText(frenchMarkdown),
              }}
            />
            {englishMarkdown ? (
              <Action.CopyToClipboard
                title="Copy English Version"
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                content={{
                  html: markdownToHtml(englishMarkdown),
                  text: markdownToPlainText(englishMarkdown),
                }}
              />
            ) : null}
            {pappersUrl ? (
              <Action.OpenInBrowser
                title="Ouvrir Sur Pappers"
                url={pappersUrl}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            ) : (
              <Action
                title="Ouvrir Sur Pappers"
                icon={Icon.ExclamationMark}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={async () => {
                  await showFailureToast("Identifiant indisponible", {
                    message: "Impossible d'ouvrir la fiche Pappers pour cette entreprise.",
                  });
                }}
              />
            )}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
