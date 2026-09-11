/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import { EASYDICT_VERSION, getReleaseTagUrl, RELEASE_MARKDOWN } from "@/consts";

/**
 * Return a release Detail page with the markdown content.
 */
export default function ReleaseNotesPage() {
  return (
    <Detail
      navigationTitle="Release Notes"
      markdown={RELEASE_MARKDOWN}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser icon={Icon.Eye} title="View on GitHub" url={getReleaseTagUrl(EASYDICT_VERSION)} />
        </ActionPanel>
      }
    />
  );
}
