//
//  token-detail-actions.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jan Toman <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { ActionPanel, Action, getPreferenceValues } from "@raycast/api"
import { ColorToken, TokenProperty, TokenTransform } from "@supernovaio/supernova-sdk"
import { TokenCopyCustomPropertyActionsProps, TokenCopyValueActionsProps, TokenDetailActionsProps } from "../../definitions/props"
import { Preferences } from "../../definitions/types"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export const TokenDetailActions = (props: TokenDetailActionsProps) => {
  // ----- Render

  return (
    <ActionPanel>
      <ActionPanel.Section title={"Token data"}>
        <TokenCopyValueActions token={props.token} tokenGroup={props.tokenGroup} />
      </ActionPanel.Section>
      <ActionPanel.Section title={"Token properties"}>
        <TokenCopyCustomPropertyActions token={props.token} tokenGroup={props.tokenGroup} />
      </ActionPanel.Section>
    </ActionPanel>
  )
}

const TokenCopyValueActions = (props: TokenCopyValueActionsProps): JSX.Element => {
  let actions = [
    <Action.CopyToClipboard key="action-copy-css" title={`Copy CSS`} content={new TokenTransform().tokenToCSS(props.token as any)} />,
    <Action.CopyToClipboard
      key="action-copy-css-variable"
      title={`Copy CSS variable`}
      content={new TokenTransform().tokenToCSSVariableDeclaration(props.token as any, processTokenName(props.token.name))}
    />,
    <Action.CopyToClipboard key="action-copy-name" title={`Copy Name`} content={props.token.name} />
  ]

  if (props.token instanceof ColorToken) {
    actions = [
      ...actions,
      <Action.CopyToClipboard key="action-copy-hex" title={`Copy HEX`} content={new TokenTransform().colorTokenToHEXorHEXA(props.token)} />,
      <Action.CopyToClipboard key="action-copy-rgba" title={`Copy RGBA`} content={new TokenTransform().colorTokenToRGBA(props.token)} />,
      <Action.CopyToClipboard key="action-copy-hsla" title={`Copy HSLA`} content={new TokenTransform().colorTokenToHSLA(props.token)} />,
      <Action.CopyToClipboard key="action-copy-hsva" title={`Copy HSVA`} content={new TokenTransform().colorTokenToHSVA(props.token)} />
    ]
  }

  return <>{...actions}</>
}

const TokenCopyCustomPropertyActions = (props: TokenCopyCustomPropertyActionsProps): JSX.Element => {
  return (
    <>
      {(props.token as any).properties.map(function (property: TokenProperty) {
        const value = property.value.toString()
        if (value !== "") {
          return <Action.CopyToClipboard title={`Copy ${property.name} Value (${value})`} key={"cp-" + property.codeName} content={value} />
        }
      })}
    </>
  )
}

function processTokenName(name: string) {
  name = name.trim()
  const preferences: Preferences = getPreferenceValues()

  switch (preferences.tokenNameTransformer) {
    case "camel":
      return name
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
          return index === 0 ? word.toLowerCase() : word.toUpperCase()
        })
        .replace(/\s+/g, "")
    case "original":
      return name
    case "snake":
      return (name.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g) ?? []).map((x) => x.toLowerCase()).join("_")
    case "lower":
      return name.toLowerCase()
    case "upper":
      return name.toUpperCase()
    default: // Kebab or not specified
      return name.replace(/\s+/g, "-").toLowerCase()
  }
}
