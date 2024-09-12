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
	return fetchLexicon(url);
}

export async function fetchLexicons(onFetch: (nsid: string, doc: LexiconDoc | null) => void) {
	const lexiconDocs: Record<string, LexiconDoc | null> = {};

	return recursiveFetchLexiconDocuments(
		`https://api.github.com/repos/${LEXICONS_REPO}/contents${LEXICONS_PATH}`,
		(nsid, doc) => {
			lexiconDocs[nsid] = doc;
			onFetch(nsid, doc);
		},
	)
		.then(() => writeLexiconsToDisk(lexiconDocs))
		.then(() => LocalStorage.setItem("lastFetched", Date.now()));
}

async function recursiveFetchLexiconDocuments(
	url: string,
	onFetch: (nsid: string, doc: LexiconDoc | null) => void,
): Promise<void> {
	const response = await fetch(url).catch(() => null);
	if (!response?.ok) return;

	const contents = await response.json();
	if (!Array.isArray(contents)) return;

	return Promise.allSettled(
		contents.map(async (entry) => {
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
				return recursiveFetchLexiconDocuments(entry._links.self, onFetch).then(() => {});
			} else if (entry.type === "file") {
				if (!("download_url" in entry) || typeof entry.download_url !== "string") return;
				return fetchLexicon(entry.download_url).then((result) => {
					if (result) {
						const { nsid, doc } = result;
						onFetch(nsid, doc);
					}
				});
			}
		}),
	).then(() => {});
}

async function fetchLexicon(url: string): Promise<{ nsid: string; doc: LexiconDoc | null } | null> {
	const response = await fetch(url);
	if (response.ok) {
		const doc = await response.json();
		if (typeof doc === "object") {
			try {
				const parsed = parseLexiconDoc(doc);
				return { nsid: parsed.id, doc: parsed };
			} catch {}
		}
	} else if (response.status === 403) throw new Error(response.status + " " + response.statusText);

	const [, nsid1, nsid2, nsid3, nsid4] = url.match(/lexicons\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\.json/) || [];
	if (nsid1 && nsid2 && nsid3 && nsid4) {
		const nsid = `${nsid1}.${nsid2}.${nsid3}.${nsid4}`;
		return { nsid, doc: null };
	} else {
		return null;
	}
}
