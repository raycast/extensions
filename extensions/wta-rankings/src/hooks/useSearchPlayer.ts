import { useState } from "react";
import { normalizeString } from "../utils/normalizeString";
import { Player } from "../types/player";

export const useSearchPlayer = (players: Player[] | undefined) => {
	const [searchInput, setSearchInput] = useState<string>();

	const searchedPlayers = players?.filter((player) => {
		const normalizedName = normalizeString(player.name);
		const normalizedSearch = normalizeString(searchInput || "");
		return normalizedName.includes(normalizedSearch);
	});

	return {
		searchedPlayers,
		onSearch: setSearchInput,
		isSearching: !!searchInput,
	};
};
