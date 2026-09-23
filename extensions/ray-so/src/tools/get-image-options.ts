import { getPreferenceValues } from "@raycast/api";

type Config = {
  themes: { id: string; name: string }[];
  languages: { id: string; name: string }[];
  padding: number[];
};

/** List current ray.so image options and the user's saved defaults without changing them. */
export default async function getImageOptions() {
  const response = await fetch("https://ray.so/api/config");
  if (!response.ok) {
    throw new Error(`Could not load ray.so image options (${response.status}). Please try again.`);
  }
  const config = (await response.json()) as Config;
  const preferences = getPreferenceValues<Preferences>();

  return {
    defaults: {
      theme: preferences.theme,
      padding: Number(preferences.padding),
      darkMode: preferences.darkMode,
      background: preferences.background,
      language: "auto",
    },
    themes: config.themes.map(({ id, name }) => ({ id, name })),
    languages: [{ id: "auto", name: "Auto-Detect" }, ...config.languages.map(({ id, name }) => ({ id, name }))],
    padding: config.padding,
  };
}
