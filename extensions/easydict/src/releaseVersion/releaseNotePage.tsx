/*
 * @author: tisfeng
 * @createTime: 2022-07-01 21:54
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-19 23:14
 * @fileName: releaseNotePage.tsx
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useState } from "react";
import { releaseNote } from "./releaseNote";
import { Easydict } from "./versionInfo";

/**
 * Return a release Detail page with the markdown content.
 *
 * @fallbackMarkdown The placeholder markdown content before fetching from GitHub.
 */
export default function ReleaseNotesPage(props: { fallbackMarkdown?: string }) {
  const [releaseMarkdown, setReleaseMarkdown] = useState<string>(releaseNote);

  console.log(`call ReleaseDetail function`);
  const easydict = new Easydict();
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
