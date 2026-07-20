import { ScriptCommand } from "@models";

import { checkIsValidURL } from "@urls";

import { URLConstants } from "Const";

const Expression = {
  emoji: /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/gi,
};

export enum IconStyle {
  Light,
  Dark,
}

export enum IconType {
  Emoji,
  URL,
}

export interface IconResult {
  type: IconType;
  content: string;
}

export const iconDarkURLFor = (scriptCommand: ScriptCommand) => iconURL(scriptCommand, IconStyle.Dark);

export const iconLightURLFor = (scriptCommand: ScriptCommand) => iconURL(scriptCommand, IconStyle.Light);

const iconURL = (scriptCommand: ScriptCommand, style: IconStyle): IconResult | null => {
  if (!scriptCommand.icon) {
    return null;
  }

  let path = scriptCommand.icon.light;

  if (style === IconStyle.Dark) {
    path = scriptCommand.icon.dark;
  }

  if (!path || path.length == 0) {
    return null;
  }

  const emojiRegex = new RegExp(Expression.emoji);

  if (emojiRegex.test(path)) {
    return {
      type: IconType.Emoji,
      content: path,
    };
  } else if (checkIsValidURL(path)) {
    return {
      type: IconType.URL,
      content: path,
    };
  }

  const url = `${URLConstants.baseRawURL}/${scriptCommand.path}${path}`;

  return {
    type: IconType.URL,
    content: url,
  };
};
