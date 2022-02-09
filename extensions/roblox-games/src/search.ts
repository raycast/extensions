import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { getRobloxCookie } from "./auth";
import { requestIconForGames } from "./icons";

let sortToken: Promise<string> | undefined;
function getSortToken(cookie: string): Promise<string> {
	if (sortToken)
		return sortToken.catch(() => {
			sortToken = undefined;
			return getSortToken(cookie);
		});
	return (sortToken = new Promise(async (resolve, reject) => {
		const f = await fetch("https://games.roblox.com/v1/games/sorts?gameSortsContext=HomeSorts", {
			headers: {
				cookie: " .ROBLOSECURITY=" + cookie + ";",
				"User-Agent": "Roblox/WinInet",
			},
		});
		if (f.status != 200) return reject(new Error("Failed to get sort token"));
		const json = (await f.json()) as any;
		const foundSort = json.sorts.find((s: { name: string }) => s.name == getPreferenceValues().defaultsort)!;
		return resolve(foundSort.token);
	}));
}

export default async function performSearch(searchText: string, signal: AbortSignal): Promise<Game[]> {
	const cookie = await getRobloxCookie();
	const st = await getSortToken(cookie);
	const url =
		"https://games.roblox.com/v1/games/list?" +
		(searchText ? "keyword=" + encodeURIComponent(searchText) : "sortToken=" + st);
	const response = await fetch(url, {
		headers: {
			Cookie: ".ROBLOSECURITY=" + cookie + ";",
			"User-Agent": "Roblox/WinInet",
		},
		signal,
	});

	const json = (await response.json()) as any;
	if (json.errors) throw new Error(json.errors[0].message);
	const games = json.games as Game[];
	await requestIconForGames(games);
	// artificial delay to let the icon requests finish
	// no it doesn't work without the delay sadly
	//return new Promise((r) => setTimeout(() => r(games), 300));
	return games;
}
