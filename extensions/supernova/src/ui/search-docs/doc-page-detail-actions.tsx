//
//  doc-page-detail-actions.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { ActionPanel, Action, useNavigation, Icon, getPreferenceValues } from "@raycast/api"
import { DocPageDetailActionProps } from "../../definitions/props"
import { DocPageDetailView } from "./doc-page-detail-view"
import { Preferences } from "../../definitions/types"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export default function DocPageDetailActions(props: DocPageDetailActionProps) {
  const editorUrl = props.page.editorUrl
  const siteUrl = props.page.deployedPageUrl
  const preferences: Preferences = getPreferenceValues()
  const { push } = useNavigation()
  const actionOpenDocsSite = siteUrl ? <Action.OpenInBrowser title="Open Docs Site" url={siteUrl} /> : null
  const actionOpenPage = props.canPushDetail ? (
    <Action title="Open Page" onAction={() => push(<DocPageDetailView page={props.page} />)} icon={Icon.Document} />
  ) : null

  // ----- Render

  return (
    <ActionPanel>
      <ActionPanel.Section title={"Documentation"}>
        {preferences.documentationPagePrimaryAction === "docsSite" ? (
          <>
            {actionOpenDocsSite}
            {actionOpenPage}
          </>
        ) : (
          <>
            {actionOpenPage}
            {actionOpenDocsSite}
          </>
        )}
        {editorUrl ? <Action.OpenInBrowser title="Open Docs Editor" url={editorUrl} /> : null}
      </ActionPanel.Section>
    </ActionPanel>
  )
}
