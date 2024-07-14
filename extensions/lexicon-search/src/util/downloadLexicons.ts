import * as fs from "node:fs/promises";
import fetch from "cross-fetch";
import { LexiconDoc, parseLexiconDoc } from "@atproto/lexicon";
import { environment, LocalStorage } from "@raycast/api";
import path from "node:path";

const LEXICONS_REPO = "bluesky-social/atproto";
const LEXICONS_PATH = "/lexicons";

export async function loadLexiconsFromDisk() {
	const lexiconDocsPath = path.join(environment.supportPath, "lexicons.json");
	const data = await fs.readFile(lexiconDocsPath, "utf-8");
	return JSON.parse(data) as Record<string, LexiconDoc | null>;
}

export async function writeLexiconsToDisk(lexiconDocs: Record<string, LexiconDoc | null>) {
	const lexiconDocsPath = path.join(environment.supportPath, "lexicons.json");
	await fs.writeFile(lexiconDocsPath, JSON.stringify(lexiconDocs, null, 2));
}

export async function loadSingleLexicon(nsid: string) {
	const url = `https://raw.githubusercontent.com/${LEXICONS_REPO}/main/lexicons/${nsid.replace(/\./g, "/")}.json`;
	const response = await fetch(url);
	if (!response.ok) {
		return null;
	}

	const doc = await response.json();
	if (typeof doc !== "object") {
		return null;
	}

	try {
		return parseLexiconDoc(doc);
	} catch (e) {
		return null;
	}
}

export async function fetchLexicons() {
	const response = await fetch(`https://api.github.com/repos/${LEXICONS_REPO}/contents${LEXICONS_PATH}`);
	if (!response.ok) {
		throw new Error(response.status + " " + response.statusText);
	}

	const dirs = await response.json();
	if (!Array.isArray(dirs)) {
		throw new Error(`Invalid response structure`);
	}

	const lexiconDocUrls: Array<string> = [];

	for (const dir of dirs) {
		await recursiveFetchLexiconDocuments(dir, lexiconDocUrls);
	}

	const lexiconDocs: Record<string, LexiconDoc | null> = {};

	for (const url of lexiconDocUrls) {
		try {
			const response = await fetch(url).catch(() => null);
			if (!response?.ok) {
				throw null;
			}

			const doc = await response.json();
			if (typeof doc !== "object") {
				throw null;
			}

			const lexiconDoc = parseLexiconDoc(doc);
			lexiconDocs[lexiconDoc.id] = lexiconDoc;
		} catch (e) {
			const [, nsid1, nsid2, nsid3, nsid4] =
				url.match(/lexicons\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\.json/) || [];
			if (nsid1 && nsid2 && nsid3 && nsid4) {
				lexiconDocs[`${nsid1}.${nsid2}.${nsid3}.${nsid4}`] = null;
			}
		}
	}

	void writeLexiconsToDisk(lexiconDocs).then(() => LocalStorage.setItem("lastFetched", Date.now()));
	return lexiconDocs;
}

async function recursiveFetchLexiconDocuments(entry: unknown, urls: Array<string>) {
	if (
		!entry ||
		typeof entry !== "object" ||
		!("path" in entry) ||
		typeof entry.path !== "string" ||
		!("type" in entry) ||
		typeof entry.type !== "string" ||
		!("_links" in entry) ||
		!entry._links ||
		typeof entry._links !== "object" ||
		!("self" in entry._links) ||
		typeof entry._links.self !== "string"
	) {
		return;
	}

	if (entry.type === "dir") {
		const response = await fetch(entry._links.self).catch(() => null);
		if (!response?.ok) return;

		const contents = await response.json();
		if (!Array.isArray(contents)) return;

		for (const content of contents) {
			await recursiveFetchLexiconDocuments(content, urls);
		}
	} else if (entry.type === "file") {
		if (!("download_url" in entry) || typeof entry.download_url !== "string") return;
		urls.push(entry.download_url);
	}
}
