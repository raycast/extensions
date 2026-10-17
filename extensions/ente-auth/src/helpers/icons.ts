import { LocalStorage } from "@raycast/api";
import fse from "fs-extra";
import path from "path";
import {
	ENTE_CUSTOM_ICONS_URL,
	ENTE_ICONS_DATABASE_URL,
	ICON_MISSES_KEY,
	ICON_MISS_TTL_MS,
	ICONS_DIR,
	SIMPLE_ICONS_CDN_URL,
} from "../constants/icons";

interface EnteIcon {
	title: string;
	slug?: string;
	altNames?: string[];
}

// Filename-safe cache key for a service.
const slugify = (service: string): string =>
	service
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

// Simple Icons slug strips all non-alphanumeric characters (e.g. "Google Cloud" -> "googlecloud").
const simpleIconSlug = (service: string): string => service.toLowerCase().replace(/[^a-z0-9]/g, "");

// Name variants to try, most specific first: full name, then without parenthetical qualifiers, then
// prefixes with trailing words dropped (so e.g. "Terraform Cloud" can fall back to "Terraform").
const nameCandidates = (service: string): string[] => {
	const out: string[] = [];
	const seen = new Set<string>();
	const add = (value: string): void => {
		const normalized = value.trim().replace(/\s+/g, " ");
		if (normalized && !seen.has(normalized.toLowerCase())) {
			seen.add(normalized.toLowerCase());
			out.push(normalized);
		}
	};

	const withoutParens = service.replace(/\(.*?\)/g, " ");
	add(service);
	add(withoutParens);

	const words = withoutParens.replace(/\s+/g, " ").trim().split(" ");
	for (let length = words.length - 1; length >= 1; length--) {
		add(words.slice(0, length).join(" "));
	}

	return out;
};

const iconFilePath = (service: string): string => path.join(ICONS_DIR, `${slugify(service)}.svg`);

/** Path to a service's cached icon, or undefined if not downloaded. Safe to call during render. */
export const getIconPath = (service: string): string | undefined => {
	if (!service) return undefined;
	const file = iconFilePath(service);
	return fse.existsSync(file) ? file : undefined;
};

// `transient` marks a retryable failure (network/rate-limit/5xx) so it is not cached as a miss.
interface IconOutcome {
	svg: string | null;
	transient: boolean;
}

const NOT_FOUND: IconOutcome = { svg: null, transient: false };

const fetchSvg = async (url: string): Promise<IconOutcome> => {
	try {
		const response = await fetch(url);
		if (response.status === 404) return NOT_FOUND;
		if (!response.ok) return { svg: null, transient: true };
		const svg = await response.text();
		return svg.includes("<svg") ? { svg, transient: false } : NOT_FOUND;
	} catch {
		return { svg: null, transient: true };
	}
};

// Fetched once per session; only cached on success so a failed fetch is retried next run.
let enteIconsDatabase: EnteIcon[] | null = null;

const getEnteIconsDatabase = async (): Promise<EnteIcon[] | null> => {
	if (enteIconsDatabase) return enteIconsDatabase;
	try {
		const response = await fetch(ENTE_ICONS_DATABASE_URL);
		if (!response.ok) return null;
		const data = (await response.json()) as { icons?: EnteIcon[] };
		enteIconsDatabase = data.icons ?? [];
		return enteIconsDatabase;
	} catch {
		return null;
	}
};

const fetchEnteIcon = async (service: string): Promise<IconOutcome> => {
	const icons = await getEnteIconsDatabase();
	if (icons === null) return { svg: null, transient: true };

	for (const candidate of nameCandidates(service)) {
		const needle = candidate.toLowerCase();
		const match = icons.find((icon) =>
			[icon.title, icon.slug ?? "", ...(icon.altNames ?? [])].some((name) => name.toLowerCase() === needle)
		);
		if (match) {
			const iconName = match.slug || match.title.toLowerCase();
			return fetchSvg(`${ENTE_CUSTOM_ICONS_URL}${encodeURIComponent(iconName)}.svg`);
		}
	}
	return NOT_FOUND;
};

const fetchSimpleIcon = async (service: string): Promise<IconOutcome> => {
	let transient = false;
	const tried = new Set<string>();

	for (const candidate of nameCandidates(service)) {
		const slug = simpleIconSlug(candidate);
		if (!slug || tried.has(slug)) continue;
		tried.add(slug);

		const outcome = await fetchSvg(`${SIMPLE_ICONS_CDN_URL}${slug}`);
		if (outcome.svg) return outcome;
		if (outcome.transient) transient = true;
	}
	return { svg: null, transient };
};

type Misses = Record<string, number>;

const getMisses = async (): Promise<Misses> => {
	const raw = await LocalStorage.getItem<string>(ICON_MISSES_KEY);
	if (!raw) return {};
	try {
		return JSON.parse(raw) as Misses;
	} catch {
		return {};
	}
};

const missedRecently = (misses: Misses, service: string): boolean => {
	const timestamp = misses[service];
	return timestamp !== undefined && Date.now() - timestamp < ICON_MISS_TTL_MS;
};

/**
 * Downloads icons for services without a cached one (Ente registry first, then Simple Icons CDN).
 * Definitive misses are remembered (with a TTL) to avoid refetching; pass `force` to ignore the
 * cache and re-download everything.
 */
export const ensureIcons = async (services: string[], force = false): Promise<void> => {
	const uniqueServices = [...new Set(services.filter(Boolean))];
	if (uniqueServices.length === 0) return;

	await fse.ensureDir(ICONS_DIR);
	const misses = await getMisses();
	let missesChanged = false;

	for (const service of uniqueServices) {
		const file = iconFilePath(service);
		if (!force && (fse.existsSync(file) || missedRecently(misses, service))) continue;

		const ente = await fetchEnteIcon(service);
		const simple = ente.svg ? null : await fetchSimpleIcon(service);
		const svg = ente.svg ?? simple?.svg ?? null;

		if (svg) {
			await fse.writeFile(file, svg);
			if (service in misses) {
				delete misses[service];
				missesChanged = true;
			}
		} else if (!ente.transient && !simple?.transient) {
			misses[service] = Date.now();
			missesChanged = true;
		}
	}

	if (missesChanged) await LocalStorage.setItem(ICON_MISSES_KEY, JSON.stringify(misses));
};
