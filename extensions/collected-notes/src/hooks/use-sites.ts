import { useEffect, useState } from "react";

import { cn } from "../utils/collected-notes";
import { useRaycastCache } from "./use-raycast-cache";
import { useRaycastLocalStorage } from "./use-raycast-local-storage";

const CACHE_SITES_KEY = "sites";
const CURRENT_SITE_KEY = "sites";

export function useSites() {
	const [currentSite, setCurrentSite, clearCachedSites] = useRaycastLocalStorage(CURRENT_SITE_KEY);
	const [sites, setSites] = useRaycastCache<Awaited<ReturnType<typeof cn.sites>>>(CACHE_SITES_KEY);
	const [error, setError] = useState<{ error: Error }>();

	async function fetchSites() {
		try {
			if (!sites) {
				const sites = await cn.sites();
				if (sites) {
					setSites(sites);
				}
			}

			if (!currentSite && sites?.length) {
				setCurrentSite(sites?.[0].site_path);
			}
		} catch (error) {
			setError({
				error: error instanceof Error ? error : new Error("Something went wrong"),
			});
		}
	}

	function refreshSites() {
		clearCachedSites().then(() => fetchSites());
	}

	useEffect(() => {
		fetchSites();
	}, []);

	return {
		currentSite,
		setCurrentSite,
		sites,
		error,
		sitesAreLoading: !sites && !error,
		refreshSites,
	};
}
