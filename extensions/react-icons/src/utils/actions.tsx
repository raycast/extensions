import { Action } from "@raycast/api";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionFunction, Actions } from "../types";

export const actions: Record<Actions, ActionFunction> = {
  copyJSX: (name, _) => (
    <Action.CopyToClipboard
      key={name}
      title="Copy JSX"
      content={`<${name} />`}
    />
  ),
  copySVG: (name, IconComponent) => (
    <Action.CopyToClipboard
      key={name}
      title="Copy SVG"
      content={renderToStaticMarkup(<IconComponent />)}
    />
  ),
  copyName: (name, _) => (
    <Action.CopyToClipboard key={name} title="Copy Name" content={name} />
  ),
  pasteJSX: (name, _) => (
    <Action.Paste key={name} title="Paste JSX" content={`<${name} />`} />
  ),
  pasteSVG: (name, IconComponent) => (
    <Action.Paste
      key={name}
      title="Paste SVG"
      content={renderToStaticMarkup(<IconComponent />)}
    />
  ),
  pasteName: (name, _) => (
    <Action.Paste key={name} title="Paste Name" content={name} />
  ),
};
