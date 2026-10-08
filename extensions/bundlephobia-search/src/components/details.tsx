import React from "react";
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { Package } from "../types";
import { getBundlephobiaLink, getReadableFileSize } from "../utils";
import { useSizeData, useToastError } from "../hooks";

export function Details({ name, description, version, links }: Package) {
  const { state } = useSizeData(name);
  useToastError(state, "Failed to fetch size data");

  const markdown = [`# ${name}@${version}`, `${description}\n`];

  if (state.status === "success") {
    markdown.push(
      "## Minified",
      `# 💾 ${getReadableFileSize(state.data.size)}`,
      "## Minified + gzipped",
      `# 📦 ${getReadableFileSize(state.data.gzip)}`
    );
  }

  if (state.status === "error") {
    markdown.push(`⚠️ ${state.error}`);
  }

  return (
    <Detail
      isLoading={state.status === "loading"}
      markdown={markdown.join("\n")}
      metadata={
        <Detail.Metadata>
          {!!links.repository && (
            <Detail.Metadata.Link
              title="Repo"
              target={links.repository}
              text={`${name} repo`}
            />
          )}

          {!!links.npm && (
            <Detail.Metadata.Link
              title="Npm"
              target={links.npm}
              text={`${name} npm`}
            />
          )}

          {!!links.homepage && (
            <Detail.Metadata.Link
              title="Homepage"
              target={links.homepage}
              text={`${name} homepage`}
            />
          )}

          {state.status === "success" && (
            <>
              <Detail.Metadata.Label
                title="Tree shakeable"
                text={state.data.hasJSModule ? "Yes" : "No"}
                icon={Icon.Tree}
              />

              <Detail.Metadata.Label
                title="Side effects"
                text={state.data.hasSideEffects ? "Yes" : "No"}
                icon={
                  state.data.hasSideEffects ? Icon.Warning : Icon.CheckCircle
                }
              />

              <Detail.Metadata.Label
                title="Dependencies"
                text={state.data.dependencyCount.toString()}
                icon={Icon.Box}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={getBundlephobiaLink(name)} />
          <Action.OpenInBrowser
            title="Open Repository in Browser"
            url={links.repository}
            shortcut={{ key: "1", modifiers: [] }}
          />
          <Action.OpenInBrowser
            title="Open npm Page in Browser"
            url={links.npm}
            shortcut={{ key: "2", modifiers: [] }}
          />
          <Action.OpenInBrowser
            title="Open Package Homepage in Browser"
            url={links.homepage}
            shortcut={{ key: "3", modifiers: [] }}
          />
        </ActionPanel>
      }
    />
  );
}
