import { Action, ActionPanel, getPreferenceValues } from "@raycast/api";
import { Ayah, format_ayahs, OutputFormat, quran_com_url } from "./quran";

export function AyahActionSections({
  ayahs,
  copy_title = "Copy Plain Text",
  paste_title = "Paste Plain Text",
}: {
  ayahs: Ayah[];
  copy_title?: string;
  paste_title?: string;
}) {
  const preferences = getPreferenceValues<Preferences>();

  return (
    <>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title={copy_title}
          content={format_ayahs(ayahs, preferences, "plain")}
        />
        <Action.CopyToClipboard
          title="Copy Imlai Text"
          content={format_ayahs(
            ayahs,
            { ...preferences, text_style: "imlai" },
            "plain",
          )}
        />
        <Action.Paste
          title={paste_title}
          content={format_ayahs(ayahs, preferences, "plain")}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Formats">
        <CopyFormat title="Copy Markdown" ayahs={ayahs} format="markdown" />
        <CopyFormat title="Copy HTML" ayahs={ayahs} format="html" />
        <Action.OpenInBrowser
          title="Open on Quran.com"
          url={quran_com_url(ayahs[0])}
        />
      </ActionPanel.Section>
    </>
  );
}

function CopyFormat({
  title,
  ayahs,
  format,
}: {
  title: string;
  ayahs: Ayah[];
  format: OutputFormat;
}) {
  const preferences = getPreferenceValues<Preferences>();
  return (
    <Action.CopyToClipboard
      title={title}
      content={format_ayahs(ayahs, preferences, format)}
    />
  );
}
