import { LocalStorage, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import type { MDNResult, Preferences } from "./utils/types";
import History from "./utils/history";
import Results from "./utils/results";

export default function SearchMDNDocs() {
	const preferences = getPreferenceValues<Preferences>();
	const [searchText, setSearchText] = useState("");
	const { data, isLoading } = useFetch(`https://developer.mozilla.org/api/v1/search?q=${searchText}`, { parseResponse });

	return (
		<List isLoading={isLoading} throttle onSearchTextChange={setSearchText} searchBarPlaceholder="Search MDN Docs">
			{searchText && data ? (
				<List.Section title="Results" subtitle={data.length + ""}>
					<Results results={data} />
				</List.Section>
			) : preferences.rememberSearchHistory ? (
				<History />
			) : null}
		</List>
	);
}

async function parseResponse(res: Response) {
	const json = (await res.json()) as { documents: MDNResult[] } | { code: string; message: string };

	if (!res.ok || "message" in json) throw new Error("message" in json ? json.message : "An error occurred");

	if (!json.documents.length) return [];

	const preferences = getPreferenceValues<Preferences>();

	if (!preferences.rememberSearchHistory) return json.documents;

	const MAX_HISTORY = Number(preferences.maxSearchHistory) || 5;

	const recentSearches = await LocalStorage.getItem<string>("recentSearches");
	if (!recentSearches) await LocalStorage.setItem("recentSearches", JSON.stringify([json.documents[0]]));
	else {
		let r = JSON.parse(recentSearches) as MDNResult[];

		r = r.filter((res) => res.mdn_url !== json.documents[0].mdn_url);

		if (r.length >= MAX_HISTORY) r = r.slice(0, MAX_HISTORY - 1);

		r = [json.documents[0], ...r];

		await LocalStorage.setItem("recentSearches", JSON.stringify(r));
	}

	return json.documents;
}
