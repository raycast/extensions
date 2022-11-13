import { Action } from "@raycast/api";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionFunction, Actions } from "../types";

export const actions: Record<Actions, ActionFunction> = {
  copyJSX: (name, _) => <Action.CopyToClipboard title="Copy JSX" content={`<${name} />`} />,
  copySVG: (_, IconComponent) => (
    <Action.CopyToClipboard title="Copy SVG" content={renderToStaticMarkup(<IconComponent />)} />
  ),
  copyName: (name, _) => <Action.CopyToClipboard title="Copy Name" content={name} />,
  pasteJSX: (name, _) => <Action.Paste title="Paste JSX" content={`<${name} />`} />,
  pasteSVG: (_, IconComponent) => <Action.Paste title="Paste SVG" content={renderToStaticMarkup(<IconComponent />)} />,
  pasteName: (name, _) => <Action.Paste title="Paste Name" content={name} />,
};
