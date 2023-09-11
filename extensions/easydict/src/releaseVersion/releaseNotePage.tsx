/*
 * @author: tisfeng
 * @createTime: 2022-07-01 21:54
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-01-08 17:43
 * @fileName: releaseNotePage.tsx
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useState } from "react";
import { Easydict } from "./versionInfo";

/**
 * Return a release Detail page with the markdown content.
 *
 * @fallbackMarkdown The placeholder markdown content before fetching from GitHub.
 */
export default function ReleaseNotesPage(props: { fallbackMarkdown?: string }) {
  console.log(`call ReleaseDetail function`);
  const easydict = new Easydict();

  const [releaseMarkdown, setReleaseMarkdown] = useState<string>(easydict.releaseMarkdown);

  easydict.fetchReleaseMarkdown().then((markdown) => {
    setReleaseMarkdown(markdown);
  });

  return (
    <Detail
      navigationTitle="Release Notes"
      markdown={releaseMarkdown || props.fallbackMarkdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser icon={Icon.Eye} title="View on GitHub" url={easydict.getCurrentReleaseTagUrl()} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Return a markdown page with the markdown content.
 */
export function MarkdownPage(props: { markdown: string }) {
  return (
    <Detail
      markdown={props.markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={Icon.Link}
            title="View Details on GitHub"
            url="https://github.com/tisfeng/Raycast-Easydict#readme"
          />
        </ActionPanel>
      }
    />
  );
}
