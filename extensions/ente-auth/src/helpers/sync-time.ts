import { formatDistance } from "date-fns/formatDistance";

export function formatLastSync(syncedAt: number | undefined, now = Date.now()): string {
	if (syncedAt === undefined || !Number.isFinite(syncedAt)) {
		return "Not yet synced";
	}

	return formatDistance(Math.min(syncedAt, now), now, { addSuffix: true });
}
