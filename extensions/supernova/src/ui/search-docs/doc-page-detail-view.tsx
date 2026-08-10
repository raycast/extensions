//
//  doc-page-detail-view.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { Detail } from "@raycast/api"
import DocPageDetailActions from "./doc-page-detail-actions"
import { DocPageDetailViewProps } from "../../definitions/props"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export const DocPageDetailView = (props: DocPageDetailViewProps) => {
  // --- Render
  return (
    <Detail
      navigationTitle={`Documentation / ${props.page.title}`}
      markdown={props.page.markdown ?? ""}
      actions={<DocPageDetailActions page={props.page} canPushDetail={false} />}
    />
  )
}
