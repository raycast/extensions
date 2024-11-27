//
//  component-detail-actions.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { ActionPanel, Action } from "@raycast/api"
import { ComponentPropertyLinkElementType, ComponentPropertyType } from "@supernovaio/supernova-sdk"
import { ComponentDetailActionProps, ComponentCopyLinkActionProps } from "../../definitions/props"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export const ComponentDetailActions = (props: ComponentDetailActionProps) => {
  // ----- Render
  return (
    <ActionPanel>
      <ActionPanel.Section title={"Component links"}>
        <ComponentCopyLinkActions component={props.component} />
      </ActionPanel.Section>
    </ActionPanel>
  )
}

const ComponentCopyLinkActions = (props: ComponentCopyLinkActionProps): JSX.Element => {
  const actions: Array<any> = []
  const values = props.component.propertyValues

  for (const property of props.component.properties) {
    // For each property of the component that is defined as custom property in SDK, we can create a new action
    const value = (values as any)[property.codeName]
    if (property.propertyType === ComponentPropertyType.url && value) {
      // For url properties, a simple url will do
      actions.push(<Action.OpenInBrowser key={`action-open-property-${property.codeName}`} title={`Open ${property.name}`} url={value} />)
    } else if (property.propertyType === ComponentPropertyType.link && value && property.linkElementType === ComponentPropertyLinkElementType.figmaComponent) {
      // For links to potential figma component, we generate link that opens Figma file
      const url = (props.component.propertyUrls as any)[property.codeName]
      if (url) {
        actions.push(<Action.OpenInBrowser key={`action-open-property-${property.codeName}`} title={`Open ${property.name}`} url={url} />)
      }
    } else if (
      property.propertyType === ComponentPropertyType.link &&
      value &&
      (property.linkElementType as any) === "DocumentationPage" // Needs fix in SDK, incorrect enum value defined in type
    ) {
      // For links that are pointing to documentation page, we add:
      // URL to the documentation site, if deployed
      const deployedUrl = (props.component.propertySiteUrls as any)[property.codeName]
      if (deployedUrl) {
        actions.push(<Action.OpenInBrowser key={`action-open-property-d-${property.codeName}`} title={`Open Component Docs on Site`} url={deployedUrl} />)
      }
      // URL to editor, if available
      const editorUrl = (props.component.propertyEditorUrls as any)[property.codeName]
      if (editorUrl) {
        actions.push(<Action.OpenInBrowser key={`action-open-property-e-${property.codeName}`} title={`Open Component Docs in Editor`} url={editorUrl} />)
      }
    }
  }

  return <>{...actions}</>
}
