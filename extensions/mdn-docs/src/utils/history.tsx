import { List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import Results from "./results";
import { MDNResult } from "./types";

export default function History() {
	const [history, setHistory] = useState<MDNResult[]>([]);

	useEffect(() => {
		async function getHistory() {
			const ls = await LocalStorage.getItem<string>("recentSearches");
			if (ls) setHistory(JSON.parse(ls));
		}

		getHistory();
	}, []);

	return (
		<List.Section title="Recent Results" subtitle={history.length + ""}>
			<Results results={history} inHistory />
		</List.Section>
	);
}

export async function clearHistory() {
	await LocalStorage.removeItem("recentSearches");
}

export async function removeFromHistory(item: MDNResult) {
	const recentSearches = await LocalStorage.getItem<string>("recentSearches");
	if (!recentSearches) return;

	const r = JSON.parse(recentSearches) as MDNResult[];

	await LocalStorage.setItem("recentSearches", JSON.stringify(r.filter((res) => res.mdn_url !== item.mdn_url)));
}
