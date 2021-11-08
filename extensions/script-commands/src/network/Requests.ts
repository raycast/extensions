import { showToast, ToastStyle } from "@raycast/api"
import fetch from "node-fetch"

import { Main, Group, ScriptCommand } from "@models"

const baseURL = "https://raw.githubusercontent.com/raycast/script-commands/master/commands";

const Constants = {
  Regex: {
    emoji: /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/gi,
  },
  extensionsURL: `${baseURL}/extensions.json`,
  languageImageURL: `${baseURL}/images`
}

enum IconStyle {
  Light,
  Dark,
}

export async function fetchScriptCommands(): Promise<Main | null> {
  try {
    const response = await fetch(Constants.extensionsURL);
    const json = await response.json();
    const main = json as Main;

    main.groups.sort((a, b) => {
      const left = a as Group;
      const right = b as Group;

      if (left.name > right.name) {
        return 1;
      }

      return -1;
    });

    return main
  }
  catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load Script Commands");

    return Promise.resolve(null);
  }
}

export const languageURL = (language: string) => `${Constants.languageImageURL}/icon-${language}.png`

export const iconDarkURL = (scriptCommand: ScriptCommand) => iconURL(scriptCommand, IconStyle.Dark);

export const iconLightURL = (scriptCommand: ScriptCommand) => iconURL(scriptCommand, IconStyle.Light);

function iconURL(scriptCommand: ScriptCommand, style: IconStyle): string | null {
  let path = scriptCommand.icon.light

  if (style == IconStyle.Dark) {
    path = scriptCommand.icon.dark
  }

  if (Constants.Regex.emoji.test(path)) {
    return path
  }

  if (path != null && path != undefined && path.length > 0) {
    const url = `${baseURL}/${scriptCommand.path}${path}`

    return url
  }

  return null
}