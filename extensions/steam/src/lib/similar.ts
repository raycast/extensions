import { steamFetch } from "./http";

export type SimilarSection = { title: string; appids: number[] };

const DIVIDER = '<h2 class="morelike_section_divider">';

// Steam has no API for "More like this", so this reads the app ids off the store page's tiles
export async function getSimilarGames(appid: number): Promise<SimilarSection[]> {
  const response = await steamFetch(`https://store.steampowered.com/recommended/morelike/app/${appid}/?l=english`, {
    redirect: "manual",
  });
  // Unknown apps redirect to the store front, whose tiles aren't similar games
  if (response.status >= 300 && response.status < 400) return [];
  if (!response.ok) throw new Error(`Steam could not load similar games (${response.status}).`);

  const [first, ...rest] = (await response.text()).split(DIVIDER);
  const groups = [
    { title: "Similar Games", html: first },
    ...rest.map((html) => ({ title: html.slice(0, html.indexOf("<")).trim(), html })),
  ];
  // The page header shows the game itself, and one game can sit in several groups
  const seen = new Set([appid]);
  return groups
    .map(({ title, html }) => {
      const appids: number[] = [];
      // Bundle tiles list several ids in one attribute, so the pattern skips them
      for (const [, id] of html.matchAll(/data-ds-appid="(\d+)"/g)) {
        if (seen.has(Number(id))) continue;
        seen.add(Number(id));
        appids.push(Number(id));
      }
      return { title, appids };
    })
    .filter((group) => group.appids.length);
}
