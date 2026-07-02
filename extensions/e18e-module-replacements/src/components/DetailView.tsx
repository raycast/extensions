import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { Fragment } from "react";

import { Mappings, TYPE_COLOR, TYPE_LABEL } from "../constants";
import { npmxUrl, resolveDocUrl, toMarkdown, urlLabel } from "../utils";

type Props = {
  moduleName: string;
};

export function DetailView({ moduleName }: Props) {
  const module = Mappings.get(moduleName);
  if (!module) return null;

  const replacements = module.replacements;
  const moduleUrl = module.url;

  return (
    <Detail
      navigationTitle={moduleName}
      markdown={toMarkdown(module)}
      metadata={
        <Detail.Metadata>
          {moduleUrl && (
            <>
              <Detail.Metadata.Link title="Documentation" text="e18e docs" target={resolveDocUrl(moduleUrl)} />
              <Detail.Metadata.Separator />
            </>
          )}

          {module.replacements.map((replacement, index) => (
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

              {replacement.type === "native" && replacement.url && (
                <Detail.Metadata.Link
                  title="Documentation"
                  text={urlLabel(replacement.url)}
                  target={resolveDocUrl(replacement.url)}
                />
              )}

              {replacement.type === "documented" && (
                <Detail.Metadata.Link title="npmx" text={replacement.id} target={npmxUrl(replacement.id)} />
              )}
            </Fragment>
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {module.url && (
            <Action.OpenInBrowser title={`Open on ${urlLabel(module.url)}`} url={resolveDocUrl(module.url)} />
          )}
          {replacements.map((replacement) => (
            <ActionPanel.Section key={replacement.id} title={replacement.id}>
              {replacement.type === "native" && replacement.url && (
                <Action.OpenInBrowser
                  title={`Open on ${urlLabel(replacement.url)}`}
                  url={resolveDocUrl(replacement.url)}
                />
              )}

              {replacement.type === "documented" && (
                <>
                  {/* eslint-disable-next-line @raycast/prefer-title-case*/}
                  <Action.OpenInBrowser title="Open on npmx" url={npmxUrl(replacement.id)} />
                  <Action.CopyToClipboard title="Copy Package Name" content={replacement.id} />
                </>
              )}

              {replacement.type === "simple" && replacement.example && (
                <Action.CopyToClipboard title="Copy Snippet to Clipboard" content={replacement.example} />
              )}
            </ActionPanel.Section>
          ))}
        </ActionPanel>
      }
    />
  );
}
