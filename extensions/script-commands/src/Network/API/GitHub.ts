import fetch from "node-fetch";

import { showToast, ToastStyle } from "@raycast/api";

import { MainGroup, Group, ScriptCommand, MainCompactGroup, CompactGroup } from "@models";

import { sourceCodeRawURL, readmeRawURL } from "@urls";

import { URLConstants } from "Const";

import path from "path";

export async function fetchScriptCommands(): Promise<MainCompactGroup> {
  const extensionsURL = `${URLConstants.baseRawURL}/extensions.json`;

  try {
    const response = await fetch(extensionsURL);
    const json = await response.json();
    const object = json as MainGroup;

    const main: MainCompactGroup = {
      groups: [],
      totalScriptCommands: object.totalScriptCommands,
      languages: object.languages,
    };

    object.groups.sort((left: Group, right: Group) => (left.name > right.name ? 1 : -1));

    object.groups.forEach((group) => {
      main.groups.push(flattenGroups(group));

      if (group.subGroups && group.subGroups.length > 0) {
        group.subGroups.sort((left: Group, right: Group) => (left.name > right.name ? 1 : -1));

        group.subGroups.forEach((subGroup) => {
          main.groups.push(flattenGroups(subGroup, group.name));
        });
      }
    });

    return main;
  } catch (error) {
    showToast(ToastStyle.Failure, "Could not load Script Commands");

    return Promise.resolve({
      groups: [],
      totalScriptCommands: 0,
      languages: [],
    });
  }
}

type FlattenGroups = (group: Group, parentGroupName?: string) => CompactGroup;

const flattenGroups: FlattenGroups = (group, parentGroupName = undefined) => {
  if (group.scriptCommands.length > 0) {
    group.scriptCommands.sort((left: ScriptCommand, right: ScriptCommand) => (left.title > right.title ? 1 : -1));
  }

  let identifier: string = group.path;
  let title: string = group.name;
  let subtitle: string | undefined = undefined;

  if (parentGroupName && parentGroupName.length > 0) {
    const key = parentGroupName.replace(" ", "-").toLowerCase();

    identifier = `${key}-${group.path}`;
    title = group.name;
    subtitle = parentGroupName;
  }

  const compactGroup: CompactGroup = {
    identifier: identifier,
    title: title,
    subtitle: subtitle,
    readme: group.readme,
    scriptCommands: group.scriptCommands,
  };

  return compactGroup;
};

export async function fetchSourceCode(scriptCommand: ScriptCommand, signal: AbortSignal): Promise<string> {
  try {
    const url = sourceCodeRawURL(scriptCommand);
    const response = await fetch(url, { signal });

    return await response.text();
  } catch {
    if (!signal.aborted) {
      showToast(ToastStyle.Failure, `Could not load the source code for ${scriptCommand.title}`);
    }
    return Promise.resolve("");
  }
}

export async function fetchReadme(path: string, signal: AbortSignal): Promise<string> {
  try {
    const url = readmeRawURL(path);
    const response = await fetch(url, { signal });
    const content = await response.text();
    const markdown = markdownNormalized(content, path);

    return markdown;
  } catch {
    if (!signal.aborted) {
      showToast(ToastStyle.Failure, `Could not load the README for path ${path}`);
    }

    return Promise.resolve("");
  }
}

type MarkdownNormalized = (markdown: string, readmePath: string) => string;

const markdownNormalized: MarkdownNormalized = (markdown, readmePath) => {
  const groupPath = path.parse(readmePath).dir;
  const expression = /!\[[A-Za-z0-9\-._]+\]\(([A-Za-z0-9\-.\\/_]+)\)/gm;

  let content = markdown.replace(expression, (_match, path: string) => {
    if (path.length > 0 && (!path.startsWith("http") || !path.startsWith("https")))
      return `![](${URLConstants.baseRawURL}/${groupPath}/${path})`;

    return path;
  });

  // Workaround to give some padding at the bottom of the content.
  // This is needed to avoid the Action Panels button shadowing the content
  content += "\n\n&nbsp;";

  return content;
};
