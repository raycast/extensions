//
//  token-detail-view.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { List } from "@raycast/api"
import {
  ColorToken,
  MeasureToken,
  RadiusToken,
  ShadowToken,
  TextToken,
  Token,
  TokenType,
  TypographyToken,
  TokenProperty,
  BlurToken,
  GradientToken,
  FontToken,
  CustomTokenPropertyType,
  BorderToken,
  TokenTransform
} from "@supernovaio/supernova-sdk"
import { fullTokenGroupPath } from "../../utilities/url"
import { closestPantone, contrast } from "../../utilities/contrast"
import { booleanIcon, colorIcon, colorIconUsingHex } from "../../utilities/icons"
import { appendUnitToValue } from "../../utilities/units"
import tinycolor = require("tinycolor2")
import { TokenDetailViewProps, TokenValueViewProps } from "../../definitions/props"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export const TokenDetailView = (props: TokenDetailViewProps) => {
  // ----- Render
  // Note that this token doesn't have to be just color - but that is fine, as all tokens have same interface we care about (value, references)
  const anyValueToken = props.token as ColorToken

  // For the purposes of showing token details, we can consider the token

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={"Name"} text={props.token.name} />
          <List.Item.Detail.Metadata.Label title={"Path"} text={fullTokenGroupPath(props.tokenGroup, " / ")} />
          <List.Item.Detail.Metadata.Label title={"Description"} text={props.token.description.length > 0 ? props.token.description : "-"} />
          <List.Item.Detail.Metadata.Separator />
          <TokenValueView token={props.token as any} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={"Type"} text={props.token.tokenType + " token"} />
          <List.Item.Detail.Metadata.Label title={"Alias"} text={anyValueToken.value.referencedToken ? `Yes` : "No"} />
          {anyValueToken.value.referencedToken ? (
            <List.Item.Detail.Metadata.Label
              title={"Aliased token 🔗"}
              text={
                anyValueToken.value.referencedToken.origin
                  ? anyValueToken.value.referencedToken.origin.name
                    ? anyValueToken.value.referencedToken.origin.name
                    : undefined
                  : anyValueToken.value.referencedToken.name
              }
            />
          ) : null}
          <CustomPropertiesView token={props.token as any} />
        </List.Item.Detail.Metadata>
      }
    />
  )
}

const TokenValueView = (props: TokenValueViewProps<Token>): JSX.Element => {
  const token = props.token
  switch (props.token.tokenType) {
    case TokenType.color:
      return <ColorTokenValueView token={token as ColorToken} />
    case TokenType.radius:
      return <RadiusTokenValueView token={token as RadiusToken} />
    case TokenType.border:
      return <BorderTokenValueView token={token as BorderToken} />
    case TokenType.typography:
      return <TypographyTokenValueView token={token as TypographyToken} />
    case TokenType.font:
      return <FontTokenValueView token={token as FontToken} />
    case TokenType.measure:
      return <MeasureTokenValueView token={token as MeasureToken} />
    case TokenType.shadow:
      return <ShadowTokenValueView token={token as ShadowToken} />
    case TokenType.blur:
      return <BlurTokenValueView token={token as BlurToken} />
    case TokenType.gradient:
      return <GradientTokenValueView token={token as GradientToken} />
    case TokenType.text:
    case TokenType.generic:
      return <TextTokenValueView token={token as TextToken} />
    default:
      return <></>
  }
}

const CustomPropertiesView = (props: TokenValueViewProps<Token>): JSX.Element => {
  if (!props.token.properties) {
    return <></>
  }

  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      {props.token.properties.map(function (property: TokenProperty) {
        let value = property.value.toString()
        if (property.type === CustomTokenPropertyType.boolean) {
          value = property.value ? `Yes` : "No"
        }
        return <List.Item.Detail.Metadata.Label title={property.name} key={"cp-" + property.codeName} text={value !== "" ? value : "–"} />
      })}
    </>
  )
}

const ColorTokenValueView = (props: TokenValueViewProps<ColorToken>): JSX.Element => {
  if (!props.token.value.hex) {
    return <></>
  }

  const color = tinycolor(props.token.value.hex)
  const colorRgba = color.toRgb()
  const contrastWhite = contrast([colorRgba.r, colorRgba.g, colorRgba.b], [255, 255, 255])
  const contrastBlack = contrast([colorRgba.r, colorRgba.g, colorRgba.b], [0, 0, 0])
  const pantone = closestPantone(props.token)

  return (
    <>
      <List.Item.Detail.Metadata.Label title={"HEX"} text={"#" + color.toHex()} icon={colorIcon(props.token.value)} />
      <List.Item.Detail.Metadata.Label title={"RGB"} text={color.toRgbString()} icon={colorIcon(props.token.value)} />
      <List.Item.Detail.Metadata.Label title={"HSL"} text={color.toHslString()} icon={colorIcon(props.token.value)} />
      <List.Item.Detail.Metadata.Label title={"HSV"} text={color.toHsvString()} icon={colorIcon(props.token.value)} />
      <List.Item.Detail.Metadata.Label title={"Alpha / Opacity"} text={(color.getAlpha() * 100).toFixed(0) + "%"} />
      <List.Item.Detail.Metadata.Label title={"CSS"} text={cssTokenRepresentation(props.token)} />
      <List.Item.Detail.Metadata.Label
        title={"WCAG AA against white"}
        text={(contrastWhite > 4.5 ? " Pass (" : "Fail (") + contrastWhite.toFixed(2) + ")"}
        icon={booleanIcon(contrastWhite > 4.5)}
      />
      <List.Item.Detail.Metadata.Label
        title={"WCAG AA against black"}
        text={(contrastBlack > 4.5 ? " Pass (" : "Fail (") + contrastBlack.toFixed(2) + ")"}
        icon={booleanIcon(contrastBlack > 4.5)}
      />
      <List.Item.Detail.Metadata.Label
        title={"Closest named Pantone"}
        text={pantone ? pantone.name : "Not known"}
        icon={pantone ? colorIconUsingHex(pantone.hex) : null}
      />
    </>
  )
}

const RadiusTokenValueView = (props: TokenValueViewProps<RadiusToken>): JSX.Element => {
  if (!props.token.value.radius) {
    return <></>
  }

  const value = props.token.value.radius.measure
  const unit = props.token.value.radius.unit

  return (
    <>
      <List.Item.Detail.Metadata.Label title={"Value"} text={appendUnitToValue(value, unit)} />
      <List.Item.Detail.Metadata.Label title={"CSS"} text={cssTokenRepresentation(props.token)} />
    </>
  )
}

const TypographyTokenValueView = (props: TokenValueViewProps<TypographyToken>): JSX.Element => {
  const value = props.token.value

  return (
    <>
      <List.Item.Detail.Metadata.Label title={"Font Family"} text={value.font.family + " " + value.font.subfamily} />
      <List.Item.Detail.Metadata.Label title={"Font Size"} text={appendUnitToValue(value.fontSize.measure, value.fontSize.unit)} />
      {!value.lineHeight ? (
        <List.Item.Detail.Metadata.Label title={"Line Height"} text={appendUnitToValue(value.lineHeight!.measure, value.lineHeight!.unit)} />
      ) : null}
      <List.Item.Detail.Metadata.Label title={"Decoration"} text={value.textDecoration} />
      <List.Item.Detail.Metadata.Label title={"Case"} text={value.textCase === "Original" ? "As typed" : value.textCase} />
      {value.letterSpacing.measure ? (
        <List.Item.Detail.Metadata.Label title={"Letter Spacing"} text={appendUnitToValue(value.letterSpacing.measure, value.letterSpacing.unit)} />
      ) : null}
      {value.paragraphIndent.measure ? (
        <List.Item.Detail.Metadata.Label title={"Paragraph Indent"} text={appendUnitToValue(value.paragraphIndent.measure, value.paragraphIndent.unit)} />
      ) : null}
      {value.paragraphSpacing.measure ? (
        <List.Item.Detail.Metadata.Label title={"Paragraph Spacing"} text={appendUnitToValue(value.paragraphSpacing.measure, value.paragraphSpacing.unit)} />
      ) : null}
      <List.Item.Detail.Metadata.Label title={"CSS"} text={cssTokenRepresentation(props.token)} />
    </>
  )
}

const FontTokenValueView = (props: TokenValueViewProps<FontToken>): JSX.Element => {
  const value = props.token.value

  return (
    <>
      <List.Item.Detail.Metadata.Label title={"Font Family"} text={value.family ?? "Not specified"} />
      <List.Item.Detail.Metadata.Label title={"Font Subfamily"} text={value.subfamily ?? "Not specified"} />
      <List.Item.Detail.Metadata.Label title={"CSS"} text={cssTokenRepresentation(props.token)} />
    </>
  )
}

const MeasureTokenValueView = (props: TokenValueViewProps<MeasureToken>): JSX.Element => {
  if (!props.token.value.unit) {
    return <></>
  }

  const value = props.token.value.measure
  const unit = props.token.value.unit

  return (
    <>
      <List.Item.Detail.Metadata.Label title={"Value"} text={appendUnitToValue(value, unit)} />
      <List.Item.Detail.Metadata.Label title={"CSS"} text={cssTokenRepresentation(props.token)} />
    </>
  )
}

const BlurTokenValueView = (props: TokenValueViewProps<BlurToken>): JSX.Element => {
  if (!props.token.value.radius.measure) {
    return <></>
  }

  const value = props.token.value.radius.measure
  const unit = props.token.value.radius.unit
  const type = props.token.value.type

  return (
    <>
      <List.Item.Detail.Metadata.Label title={"Type"} text={type + " Blur"} />
      <List.Item.Detail.Metadata.Label title={"Value"} text={appendUnitToValue(value, unit)} />
      <List.Item.Detail.Metadata.Label title={"CSS"} text={cssTokenRepresentation(props.token)} />
    </>
  )
}

const GradientTokenValueView = (props: TokenValueViewProps<GradientToken>): JSX.Element => {
  if (!props.token.value.type) {
    return <></>
  }

  const type = props.token.value.type

  return (
    <>
      <List.Item.Detail.Metadata.Label title={"Type"} text={type + " Gradient"} />
      {...props.token.value.stops.map((s, index) => {
        const color = tinycolor(s.color.hex)
        return (
          <List.Item.Detail.Metadata.Label
            key={`gl-${index}`}
            title={`${index + 1}. gradient stop`}
            text={`#${color.toHex()}, position: ${Math.round(s.position * 100) / 100}`}
            icon={colorIcon(s.color)}
          />
        )
      })}
      <List.Item.Detail.Metadata.Label title={"CSS"} text={cssTokenRepresentation(props.token)} />
    </>
  )
}

const TextTokenValueView = (props: TokenValueViewProps<TextToken>): JSX.Element => {
  return (
    <>
      <List.Item.Detail.Metadata.Label title={"Value"} text={props.token.value.text ?? "-"} />
      <List.Item.Detail.Metadata.Label title={"CSS"} text={cssTokenRepresentation(props.token)} />
    </>
  )
}

const ShadowTokenValueView = (props: TokenValueViewProps<ShadowToken>): JSX.Element => {
  const value = props.token.value
  const color = tinycolor(props.token.value.color.hex)
  const colorHex = color.toHex()

  return (
    <>
      <List.Item.Detail.Metadata.Label title={"Color"} text={`#${colorHex}`} icon={colorIcon(value.color)} />
      <List.Item.Detail.Metadata.Label title={"Offset x"} text={appendUnitToValue(value.x.measure, value.x.unit)} />
      <List.Item.Detail.Metadata.Label title={"Offset y"} text={appendUnitToValue(value.y.measure, value.y.unit)} />
      <List.Item.Detail.Metadata.Label title={"Radius"} text={appendUnitToValue(value.radius.measure, value.radius.unit)} />
      <List.Item.Detail.Metadata.Label title={"Spread"} text={appendUnitToValue(value.spread.measure, value.spread.unit)} />
      <List.Item.Detail.Metadata.Label title={"Type"} text={value.type + " shadow"} />
      <List.Item.Detail.Metadata.Label title={"CSS"} text={cssTokenRepresentation(props.token)} />
    </>
  )
}

const BorderTokenValueView = (props: TokenValueViewProps<BorderToken>): JSX.Element => {
  const value = props.token.value
  const color = tinycolor(props.token.value.color.hex)
  const colorHex = color.toHex()

  return (
    <>
      <List.Item.Detail.Metadata.Label title={"Color"} text={`#${colorHex}`} icon={colorIcon(value.color)} />
      <List.Item.Detail.Metadata.Label title={"Width"} text={appendUnitToValue(value.width.measure, value.width.unit)} />
      <List.Item.Detail.Metadata.Label title={"Position"} text={value.position} />
      <List.Item.Detail.Metadata.Label title={"CSS"} text={cssTokenRepresentation(props.token)} />
    </>
  )
}

function cssTokenRepresentation(token: Token): string {
  const transformer = new TokenTransform()
  return transformer.tokenToCSS(token)
}
