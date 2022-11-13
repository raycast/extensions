import { Action } from "@raycast/api";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionFunction, Actions } from "../types";

export const actions: Record<Actions, ActionFunction> = {
  copyJSX: (name, _) => <Action.CopyToClipboard key={`copyJSX_${name}`} title="Copy JSX" content={`<${name} />`} />,
  copySVG: (name, IconComponent) => (
    <Action.CopyToClipboard
      key={`copySVG_${name}`}
      title="Copy SVG"
      content={renderToStaticMarkup(<IconComponent />)}
    />
  ),
  copyName: (name, _) => <Action.CopyToClipboard key={`copyName_${name}`} title="Copy Name" content={name} />,
  pasteJSX: (name, _) => <Action.Paste key={`pasteJSX_${name}`} title="Paste JSX" content={`<${name} />`} />,
  pasteSVG: (name, IconComponent) => (
    <Action.Paste key={`pasteSVG_${name}`} title="Paste SVG" content={renderToStaticMarkup(<IconComponent />)} />
  ),
  pasteName: (name, _) => <Action.Paste key={`pasteName_${name}`} title="Paste Name" content={name} />,
};
