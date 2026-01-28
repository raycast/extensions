//
//  component-detail-view.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { Icon, List } from "@raycast/api"
import { ComponentPropertyLinkElementType, ComponentPropertyType } from "@supernovaio/supernova-sdk"
import { ComponentDetailViewProps, ComponentLabelProps } from "../../definitions/props"
import { booleanIcon, colorIconUsingHex, figmaIcon } from "../../utilities/icons"
const parseUrl = require("parse-url")

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export const ComponentDetailView = (props: ComponentDetailViewProps): JSX.Element => {
  // ----- Render
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {props.component.properties.map((p) => (
            <ComponentLabel component={props.component} property={p} key={`prop-${p.codeName}`} />
          ))}
        </List.Item.Detail.Metadata>
      }
      markdown={
        props.component.thumbnailUrl
          ? `# ${props.component.name}\n\n![${props.component.name}](${props.component.thumbnailUrl})`
          : `# ${props.component.name}\n\nThis component has no associated design just yet`
      }
    />
  )
}

const ComponentLabel = (props: ComponentLabelProps): JSX.Element => {
  const property = props.property
  const values = props.component.propertyValues
  const value = (values as any)[property.codeName]

  if (property.propertyType !== ComponentPropertyType.boolean && !value) {
    // For boolean, even if value is not set, we'll show icon, so skip this. With no value, we'll skip as well.
    return <List.Item.Detail.Metadata.Label title={property.name} text={"-"} />
  }

  switch (property.propertyType) {
    case ComponentPropertyType.boolean:
      // Boolean value as yes or no
      const boolValue = value ?? false
      return <List.Item.Detail.Metadata.Label title={property.name} text={boolValue ? "Yes" : "No"} icon={booleanIcon(boolValue)} />
    case ComponentPropertyType.generic:
      // Generic text without quotes (constants)
      return <List.Item.Detail.Metadata.Label title={property.name} text={value} />
    case ComponentPropertyType.text:
      // Text with quotes (strings)
      return <List.Item.Detail.Metadata.Label title={property.name} text={`"${value}"`} />
    case ComponentPropertyType.number:
      // Numeric values
      return <List.Item.Detail.Metadata.Label title={property.name} text={`${value}`} />
    case ComponentPropertyType.select:
      // Select with colored tags. As this view doesn't support tags (sad :(), we have to get creative
      let optionValue: string | null = ""
      let optionColor: string | null = ""
      for (const option of property.options ?? []) {
        if (option.id === value) {
          optionValue = option.name
          optionColor = option.backgroundColor
        }
      }
      return (
        <List.Item.Detail.Metadata.Label
          title={property.name}
          text={optionValue ? `${optionValue}` : "-"}
          icon={optionValue && optionColor ? colorIconUsingHex(optionColor) : null}
        />
      )
    case ComponentPropertyType.url:
      // Generic link anywhere on the internet
      const parsedUrl = parseUrl(value)
      const host = parsedUrl?.resource
      return <List.Item.Detail.Metadata.Label title={property.name} text={`${host ?? "-"}`} icon={Icon.Link} />
    case ComponentPropertyType.link:
      // Link to either figma file, or documentation inside Supernova
      if ((property.linkElementType as any) === "DocumentationPage") {
        // Needs fix in SDK
        return <List.Item.Detail.Metadata.Label title={property.name} text={"supernova.io"} icon={Icon.Link} />
      } else if (property.linkElementType === ComponentPropertyLinkElementType.figmaComponent) {
        const figmaUrl = (props.component.propertyUrls as any)[property.codeName]
        const figmaName = (props.component.propertyNames as any)[property.codeName]
        if (figmaUrl) {
          return <List.Item.Detail.Metadata.Label title={property.name} text={figmaName ?? "Figma"} icon={figmaIcon()} />
        }
      }
  }

  // Realistically will never happen unless we forget later
  return <List.Item.Detail.Metadata.Label title={property.name} text={`Unsupported type ${property.propertyType}`} />
}
