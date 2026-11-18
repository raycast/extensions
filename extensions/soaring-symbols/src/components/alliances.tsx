import { Color, Icon, type Image } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import type { Airline, Alliance } from "soaring-symbols";
import { allianceMark, isMemberOf } from "../utils/airlines";
import { fetchAirlines, fetchAlliances } from "../utils/fetch";

// An alliance's mark as a Raycast image, monochrome ones tinted to the
// theme; a neutral group icon while the collection has no mark for it
export const allianceIcon = (alliance?: Alliance): Image.ImageLike => {
  const mark = allianceMark(alliance);

  return mark
    ? { source: mark.url, tintColor: mark.mono ? Color.PrimaryText : undefined }
    : { source: Icon.TwoPeople, tintColor: Color.SecondaryText };
};

// Both lists and the airlines the alliance filter lets through, for the
// commands that show the filter. `initial` opens on one alliance; `lists`,
// when a parent already loaded them, are used instead of fetching again.
export function useAllianceFilter(initial = "All", lists?: { airlines: Airline[]; alliances: Alliance[] }) {
  const fetched = useCachedPromise(fetchAirlines, [], { execute: !lists });
  const fetchedAlliances = useCachedPromise(fetchAlliances, [], { execute: !lists });
  const isLoading = !lists && fetched.isLoading;
  const airlines = lists?.airlines ?? fetched.data ?? [];
  const alliances = lists?.alliances ?? fetchedAlliances.data ?? [];
  const [alliance, setAlliance] = useState(initial);

  const byName = useMemo(() => new Map(alliances.map((a) => [a.name, a])), [alliances]);
  const filtered = useMemo(() => {
    const selected = byName.get(alliance);
    return selected ? airlines.filter((a) => isMemberOf(a, selected)) : airlines;
  }, [airlines, byName, alliance]);

  return { isLoading, airlines, alliances, byName, alliance, setAlliance, filtered };
}
