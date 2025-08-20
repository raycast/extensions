import got from "got";

export const getAllExtensions = async () => {
  const url = "https://raw.githubusercontent.com/raycast/extensions/refs/heads/main/.github/extensionName2Folder.json";
  const json = await got(url).json<Record<string, string>>();
  const extensions = Object.entries(json)
    .map(([name, folder]) => ({ name, folder }))
    .sort((a, b) => a.folder.localeCompare(b.folder));
  return extensions;
};
