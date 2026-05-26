import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { resolveDocUrl } from "module-replacements";
import { Fragment } from "react";

import { Mappings, TYPE_COLOR, TYPE_LABEL } from "../constants";
import { toMarkdown, urlLabel } from "../utils";

type Props = {
  moduleName: string;
};

function toDocTarget(url: Parameters<typeof resolveDocUrl>[0]) {
  return resolveDocUrl(url) ?? undefined;
}

export function DetailView({ moduleName }: Props) {
  const module = Mappings.get(moduleName);
  if (!module) return null;

  const replacements = module.replacements;
  const moduleDocTarget = module.url ? toDocTarget(module.url) : undefined;

  return (
    <Detail
      navigationTitle={moduleName}
      markdown={toMarkdown(module)}
      metadata={
        <Detail.Metadata>
          {moduleDocTarget && (
            <>
              <Detail.Metadata.Link title="Documentation" text="e18e docs" target={moduleDocTarget} />
              <Detail.Metadata.Separator />
            </>
          )}

          {module.replacements.map((replacement, index) => {
            const replacementDocTarget =
              replacement.type === "native" && replacement.url ? toDocTarget(replacement.url) : undefined;
            const replacementNpmxUrl =
              replacement.type === "documented"
                ? `https://www.npmx.dev/package/${encodeURIComponent(replacement.replacementModule)}`
                : undefined;

            return (
              <Fragment key={replacement.id}>
                {index !== 0 && <Detail.Metadata.Separator />}

                <Detail.Metadata.Label title="Name" text={replacement.id} />

                <Detail.Metadata.TagList title="Type">
                  <Detail.Metadata.TagList.Item
                    text={TYPE_LABEL[replacement.type]}
                    color={TYPE_COLOR[replacement.type]}
                  />
                  {replacement.preferred && <Detail.Metadata.TagList.Item text="preferred" color={Color.Green} />}
                </Detail.Metadata.TagList>

                {replacement.type === "native" && replacement.url && replacementDocTarget && (
                  <Detail.Metadata.Link
                    title="Documentation"
                    text={urlLabel(replacement.url)}
                    target={replacementDocTarget}
                  />
                )}

                {replacement.type === "documented" && replacementNpmxUrl && (
                  <Detail.Metadata.Link title="npmx" text={replacement.replacementModule} target={replacementNpmxUrl} />
                )}
              </Fragment>
            );
          })}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {module.url && moduleDocTarget && (
            <Action.OpenInBrowser title={`Open on ${urlLabel(module.url)}`} url={moduleDocTarget} />
          )}
          {replacements.map((replacement) => {
            const replacementDocTarget =
              replacement.type === "native" && replacement.url ? toDocTarget(replacement.url) : undefined;
            const replacementNpmxUrl =
              replacement.type === "documented"
                ? `https://www.npmx.dev/package/${encodeURIComponent(replacement.replacementModule)}`
                : undefined;

            return (
              <ActionPanel.Section key={replacement.id} title={replacement.id}>
                {replacement.type === "native" && replacement.url && replacementDocTarget && (
                  <Action.OpenInBrowser title={`Open on ${urlLabel(replacement.url)}`} url={replacementDocTarget} />
                )}

                {replacement.type === "documented" && replacementNpmxUrl && (
                  <>
                    {/* eslint-disable-next-line @raycast/prefer-title-case*/}
                    <Action.OpenInBrowser title="Open on npmx" url={replacementNpmxUrl} />
                    <Action.CopyToClipboard title="Copy Package Name" content={replacement.replacementModule} />
                  </>
                )}

                {replacement.type === "simple" && replacement.example && (
                  <Action.CopyToClipboard title="Copy Snippet to Clipboard" content={replacement.example} />
                )}
              </ActionPanel.Section>
            );
          })}
        </ActionPanel>
      }
    />
  );
}
