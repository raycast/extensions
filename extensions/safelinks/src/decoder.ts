/** Pure string/URL computation. Keep the extension copy byte-identical. */
export type Wrapper =
	| 'microsoft-safelinks'
	| 'proofpoint-v3'
	| 'proofpoint-v2'
	| 'proofpoint-v1'
	| 'google-redirect'
	| 'generic-url-param'
	| 'none';
export type Flag =
	| 'plain-http'
	| 'ip-literal'
	| 'userinfo'
	| 'punycode'
	| 'shortener'
	| 'nonstandard-port'
	| 'tracking-params';
export type DecodeResult =
	| { ok: true; wrapper: Wrapper; decoded: string; chain: string[]; flags: Flag[]; notes: string[] }
	| { ok: false; error: 'empty-input' | 'no-url-found' };
export type Success = Extract<DecodeResult, { ok: true }>;

const shorteners = [
	'bit.ly',
	't.co',
	'tinyurl.com',
	'goo.gl',
	'is.gd',
	'buff.ly',
	'ow.ly',
	'cutt.ly',
	'rebrand.ly',
	'aka.ms',
	'lnkd.in',
	's.id',
	'rb.gy',
	'shorturl.at'
];
const parameters = new Set(['url', 'u', 'target', 'redirect', 'dest', 'link', 'r', 'q']);
const metadataNote = 'data/sdata are tracking metadata and were discarded';
const under = (host: string, domain: string) => host === domain || host.endsWith('.' + domain);
const hostOf = (url: URL) => url.hostname.toLowerCase().replace(/\.$/, '');

function absolute(value: string): URL | undefined {
	if (!/^https?:\/\/[^\s]+$/i.test(value)) return;
	try {
		const url = new URL(value);
		if (url.hostname) return url;
	} catch {
		/* malformed URL */
	}
}

function percent(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

// Query parsing already removes one percent layer. Only remove another when
// the *scheme* is still encoded; never corrupt a destination's encoded query.
function destination(value: string): string {
	for (let i = 0; i < 2 && /^https?%3a%2f%2f/i.test(value); i++) value = percent(value);
	return value;
}

function normalize(input: string): string | undefined {
	let value = input
		.trim()
		.replace(/&amp;|&#38;|&quot;/gi, (entity) => (entity.toLowerCase() === '&quot;' ? '"' : '&'));
	const pairs: Record<string, string> = {
		'"': '"',
		"'": "'",
		'`': '`',
		'‘': '’',
		'“': '”',
		'<': '>',
		'[': ']',
		'(': ')',
		'{': '}'
	};
	while (value.length > 1 && pairs[value[0]] === value.at(-1)) value = value.slice(1, -1).trim();
	if (absolute(value)) return value;
	const schemeless = absolute('https://' + value);
	if (
		schemeless &&
		(under(hostOf(schemeless), 'safelinks.protection.outlook.com') ||
			under(hostOf(schemeless), 'urldefense.com') ||
			hostOf(schemeless) === 'urldefense.proofpoint.com')
	)
		return 'https://' + value;
	const match = value.match(/https?:\/\/[^\s<>"'‘’“”`]+/i);
	if (!match) return;
	value = match[0];
	const opening: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
	while (/[.,;:!?\)\]\}>"']$/.test(value)) {
		const last = value.at(-1)!;
		if (opening[last]) {
			const opens = [...value].filter((c) => c === opening[last]).length;
			const closes = [...value].filter((c) => c === last).length;
			if (opens >= closes) break;
		}
		value = value.slice(0, -1);
	}
	return absolute(value) ? value : undefined;
}

function unwrap(value: string): { wrapper: Wrapper; value: string; note?: string } | undefined {
	const url = absolute(value)!;
	const host = hostOf(url);
	const q = url.searchParams;
	let wrapper: Wrapper = 'none';
	let candidate: string | null = null;
	let note: string | undefined;
	if (
		under(host, 'safelinks.protection.outlook.com') ||
		(q.has('url') && (q.has('data') || q.has('sdata')))
	) {
		wrapper = 'microsoft-safelinks';
		candidate = q.get('url');
		if (['data', 'sdata', 'reserved'].some((key) => q.has(key))) note = metadataNote;
	} else if (under(host, 'urldefense.com') && url.pathname.startsWith('/v3/__')) {
		wrapper = 'proofpoint-v3';
		// Work on the full URL: the embedded destination may have a query/fragment.
		const start = value.indexOf('/v3/__') + 6;
		const end = value.indexOf('__;!!', start);
		if (end >= start) candidate = percent(value.slice(start, end));
	} else if (
		(host === 'urldefense.proofpoint.com' || host === 'urldefense.com') &&
		url.pathname.includes('/v2/url')
	) {
		wrapper = 'proofpoint-v2';
		candidate = percent((q.get('u') ?? '').replace(/_/g, '/').replace(/-/g, '%'));
	} else if (
		(host === 'urldefense.proofpoint.com' || host === 'urldefense.com') &&
		url.pathname.includes('/v1/url')
	) {
		wrapper = 'proofpoint-v1';
		candidate = q.get('u');
	} else if (
		/(^|\.)google\.(?:[a-z]{2,}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(host) &&
		url.pathname === '/url'
	) {
		wrapper = 'google-redirect';
		candidate = q.get('q');
	} else {
		const entries = [...q].filter(([key]) => parameters.has(key));
		if (entries.length !== 1) return;
		const [key, decoded] = entries[0];
		const raw =
			url.search
				.slice(1)
				.split('&')
				.find((part) => new URLSearchParams(part).has(key))
				?.split('=')
				.slice(1)
				.join('=') ?? '';
		if (/^https?%3a%2f%2f/i.test(raw) || /^https?%253a%252f%252f/i.test(raw))
			candidate = destination(decoded);
		else {
			// '+' is data in standard base64, even though URLSearchParams treats it as a space.
			const encoded = decoded.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
			if (/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
				try {
					const binary = atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='));
					candidate = new TextDecoder('utf-8', { fatal: true }).decode(
						Uint8Array.from(binary, (c) => c.charCodeAt(0))
					);
				} catch {
					/* not a base64 URL */
				}
			}
		}
		wrapper = 'generic-url-param';
	}
	if (candidate === null) return;
	candidate = destination(candidate);
	if (absolute(candidate)) return { wrapper, value: candidate, note };
}

export function isTrackingParam(key: string): boolean {
	return /^(utm_.*|gclid|fbclid|msclkid|mc_eid)$/i.test(key);
}

export function stripTrackingParams(value: string): string {
	const url = new URL(value);
	for (const key of [...url.searchParams.keys()])
		if (isTrackingParam(key)) url.searchParams.delete(key);
	return url.href;
}

function flagsFor(value: string): Flag[] {
	const url = absolute(value)!;
	const host = hostOf(url);
	const flags: Flag[] = [];
	if (url.protocol === 'http:') flags.push('plain-http');
	if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.startsWith('[')) flags.push('ip-literal');
	if (url.username || url.password || /^https?:\/\/[^/]*@/i.test(value)) flags.push('userinfo');
	if (host.split('.').some((label) => label.startsWith('xn--'))) flags.push('punycode');
	if (shorteners.some((domain) => under(host, domain))) flags.push('shortener');
	if (url.port && url.port !== '80' && url.port !== '443') flags.push('nonstandard-port');
	if ([...url.searchParams.keys()].some(isTrackingParam)) flags.push('tracking-params');
	return flags.sort();
}

export function decode(input: string): DecodeResult {
	if (!input.trim()) return { ok: false, error: 'empty-input' };
	let current = normalize(input);
	if (!current) return { ok: false, error: 'no-url-found' };
	const chain = [current];
	const notes = new Set<string>();
	let wrapper: Wrapper = 'none';
	for (let round = 0; round < 5; round++) {
		// A shortener is an opaque destination, even if its query resembles a wrapper.
		if (shorteners.some((domain) => under(hostOf(absolute(current!)!), domain))) break;
		const step = unwrap(current);
		if (!step || step.value === current || chain.includes(step.value)) break;
		if (wrapper === 'none') wrapper = step.wrapper;
		current = step.value;
		chain.push(current);
		if (step.note) notes.add(step.note);
		if (round === 4)
			notes.add('Stopped after five unwrap rounds; the destination may still be wrapped.');
	}
	return {
		ok: true,
		wrapper,
		decoded: current,
		chain,
		flags: flagsFor(current),
		notes: [...notes]
	};
}
