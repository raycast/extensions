import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { ReactNode, useMemo } from "react";
import { FontPair, fontSpec, kitDownloadUrl, PairFont } from "./api";
import { downloadZip } from "./download";
import { DOWNLOAD_SHORTCUT, fontFamilyCss, INSTALL_SHORTCUT, WebCodeActions } from "./font-actions";
import FontDetail from "./font-detail";
import { canInstallFonts, installFonts } from "./install";
import { markdownImageUrl, usePairPreviews } from "./preview";
import { Catalog } from "./use-catalog";

// Both fonts of a pair, merged when the pairing uses two styles of the same family.
function pairSpecs(pair: FontPair): string[] {
  const codes = new Map<string, number[]>();
  for (const font of [pair.headline, pair.body]) {
    codes.set(font.slug, [...new Set([...(codes.get(font.slug) ?? []), font.styleCode])]);
  }
  return [...codes].map(([slug, styleCodes]) => fontSpec(slug, styleCodes));
}

// Two pairings use two styles of the same family; list each family once.
function uniqueFamilies(pair: FontPair): PairFont[] {
  return pair.headline.familyId === pair.body.familyId ? [pair.headline] : [pair.headline, pair.body];
}

export function PairActions({ pair, catalog, children }: { pair: FontPair; catalog: Catalog; children?: ReactNode }) {
  const fontFor = (pairFont: PairFont) => catalog.fonts.find((font) => font.id === pairFont.familyId);
  const families = [...new Set(uniqueFamilies(pair).map((p) => fontFamilyCss(p.name, fontFor(p)?.categories ?? [])))];

  const download = (
    <Action
      title="Download Pairing"
      icon={Icon.Download}
      shortcut={DOWNLOAD_SHORTCUT}
      onAction={() => downloadZip(kitDownloadUrl(pairSpecs(pair)), pair.title, "Fontshare Kit.zip")}
    />
  );

  return (
    <ActionPanel title={pair.title}>
      <ActionPanel.Section>
        {children ?? download}
        {uniqueFamilies(pair).map((pairFont) => {
          const font = fontFor(pairFont);
          return font ? (
            <Action.Push
              key={pairFont.familyId}
              title={`Show ${pairFont.name}`}
              icon={Icon.Text}
              target={<FontDetail font={font} catalog={catalog} />}
            />
          ) : (
            <Action.OpenInBrowser
              key={pairFont.familyId}
              title={`Open ${pairFont.name} on Fontshare`}
              url={pairFont.url}
            />
          );
        })}
        {children && download}
        {canInstallFonts && (
          <Action
            title="Install Pairing"
            icon={Icon.Plus}
            shortcut={INSTALL_SHORTCUT}
            onAction={() => installFonts(kitDownloadUrl(pairSpecs(pair)), pair.title)}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Pairing Name"
          content={pair.title}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Web">
        <WebCodeActions specs={pairSpecs(pair)} families={families} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function describe(pairFont: PairFont): string {
  return `${pairFont.name} ${pairFont.styleName}, ${pairFont.size} px`;
}

export default function PairDetail({ pair, catalog }: { pair: FontPair; catalog: Catalog }) {
  const pairs = useMemo(() => [pair], [pair]);
  const { files, failed, retry } = usePairPreviews(pairs);
  const preview = files[pair.id];
  const hasFailed = failed.includes(pair.id);

  let body = "_Rendering preview…_";
  if (preview) {
    body = `![${pair.title}](${markdownImageUrl(preview)})`;
  } else if (hasFailed) {
    body = "_Could not render the preview. Check your internet connection and try again._";
  }
  const markdown = `# ${pair.title}\n\n${body}`;

  return (
    <Detail
      navigationTitle={pair.title}
      isLoading={!preview && !hasFailed}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Headline" text={describe(pair.headline)} />
          <Detail.Metadata.Label title="Body" text={describe(pair.body)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Headline Font" target={pair.headline.url} text={pair.headline.name} />
          <Detail.Metadata.Link title="Body Font" target={pair.body.url} text={pair.body.name} />
        </Detail.Metadata>
      }
      actions={
        <PairActions pair={pair} catalog={catalog}>
          {hasFailed ? <Action title="Retry Preview" icon={Icon.ArrowClockwise} onAction={retry} /> : undefined}
        </PairActions>
      }
    />
  );
}
