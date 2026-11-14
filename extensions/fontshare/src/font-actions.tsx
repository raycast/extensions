import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { ReactNode } from "react";
import { cssUrl, familyDownloadUrl, Font, fontSpec, genericFamily } from "./api";
import { downloadZip } from "./download";
import { canInstallFonts, installFonts } from "./install";

// ⇧⌘D was the first choice, but Raycast's own Dictation command commonly uses it as a global hotkey.
export const DOWNLOAD_SHORTCUT = Keyboard.Shortcut.Common.Save;

// Installing is macOS only, so the shortcut has no Windows binding.
export const INSTALL_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "i" };

/** Copy actions for the CSS that loads `specs` from the Fontshare CSS API. */
export function WebCodeActions({ specs, families }: { specs: string[]; families: string[] }) {
  const url = cssUrl(specs);
  return (
    <>
      <Action.CopyToClipboard title="Copy CSS Import" icon={Icon.Code} content={`@import url('${url}');`} />
      <Action.CopyToClipboard
        title="Copy HTML Link"
        icon={Icon.Code}
        content={`<link href="${url}" rel="stylesheet">`}
      />
      <Action.CopyToClipboard title="Copy Font Family CSS" icon={Icon.Code} content={families.join("\n")} />
    </>
  );
}

export function fontFamilyCss(name: string, categories: string[]): string {
  return `font-family: '${name}', ${genericFamily(categories)};`;
}

/**
 * `children` come first (e.g. "Show Details" in the list). Without them, "Download Family" is the primary action,
 * which is what the detail view wants.
 */
export function FontActions({ font, children, extra }: { font: Font; children?: ReactNode; extra?: ReactNode }) {
  const download = (
    <Action
      title="Download Family"
      icon={Icon.Download}
      shortcut={DOWNLOAD_SHORTCUT}
      onAction={() => downloadZip(familyDownloadUrl(font.slug), font.name, `${font.name}.zip`)}
    />
  );

  return (
    <ActionPanel title={font.name}>
      <ActionPanel.Section>
        {children ?? download}
        <Action.OpenInBrowser title="Open on Fontshare" url={font.url} />
        {children && download}
        {canInstallFonts && (
          <Action
            title="Install Family"
            icon={Icon.Plus}
            shortcut={INSTALL_SHORTCUT}
            onAction={() => installFonts(familyDownloadUrl(font.slug), font.name)}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Font Name"
          content={font.name}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <Action.CopyToClipboard title="Copy Font URL" content={font.url} shortcut={Keyboard.Shortcut.Common.Copy} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Web">
        <WebCodeActions specs={[fontSpec(font.slug)]} families={[fontFamilyCss(font.name, font.categories)]} />
      </ActionPanel.Section>
      {extra && <ActionPanel.Section>{extra}</ActionPanel.Section>}
    </ActionPanel>
  );
}
