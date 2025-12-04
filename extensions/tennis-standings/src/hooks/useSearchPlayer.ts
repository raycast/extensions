import { useState } from "react";
import { normalizeString } from "../utils/normalizeString";
import { Player } from "../types/player";
import { countries } from "../data/countries";
import { getCountryInfo } from "../utils/getCountryInfo";

export const useSearchPlayer = (players: Player[] | undefined) => {
  const [searchInput, setSearchInput] = useState<string>();
  const [countryCode, setCountryCode] = useState<string>("all");

  const searchedPlayers = players
    ?.filter((player) => {
      const normalizedName = normalizeString(player.name);
      const normalizedSearch = normalizeString(searchInput || "");
      return normalizedName.includes(normalizedSearch);
    })
    .filter((player) => countryCode === "all" || player.country === countryCode);

  const playerCountries = players
    ?.map((player) => player.country)
    .reduce<Partial<typeof countries>>((acc, cur) => {
      const country = getCountryInfo(cur);
      return { ...acc, [cur]: country };
    }, {});

  return {
    searchedPlayers,
    playerCountries,
    onSearch: setSearchInput,
    onFilterByCountry: setCountryCode,
    countryCode,
    isSearching: !!searchInput || countryCode !== "all",
  };
};
