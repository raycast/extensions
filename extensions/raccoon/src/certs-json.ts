import { expectObject } from "./json-out.ts";

/**
 * `rcc certs --json`.
 *
 * The question is not how many certificates a keychain holds but which ones
 * stop working, and when: expired first, then the ones about to.
 */
export type CertStatus = "expired" | "expiring" | "valid";

export type Certificate = {
	name: string;
	issuer: string;
	expires: string;
	status: CertStatus;
	self_signed: boolean;
	/** Where it lives. Empty from an rcc older than 0.19. */
	keychain: string;
	/** Its SHA-256, which is how it is addressed: names repeat, hashes do not. */
	sha256: string;
};

export type CertsReport = {
	counts: {
		total: number;
		valid: number;
		expiring: number;
		expired: number;
		self_signed: number;
	};
	expiring_window_days: number;
	certificates: Certificate[];
	keychains: string[];
};

const num = (v: unknown) => (typeof v === "number" ? v : 0);
const str = (v: unknown) => (typeof v === "string" ? v : "");

function status(v: unknown): CertStatus {
	return v === "expired" || v === "expiring" ? v : "valid";
}

export function parseCerts(stdout: string): CertsReport {
	const r = expectObject(stdout, "certs");
	const c = (r.counts ?? {}) as Record<string, unknown>;
	return {
		counts: {
			total: num(c.total),
			valid: num(c.valid),
			expiring: num(c.expiring),
			expired: num(c.expired),
			self_signed: num(c.self_signed),
		},
		expiring_window_days: num(r.expiring_window_days),
		certificates: Array.isArray(r.certificates)
			? r.certificates.map((v) => {
					const x = (v ?? {}) as Record<string, unknown>;
					return {
						name: str(x.name),
						issuer: str(x.issuer),
						expires: str(x.expires),
						status: status(x.status),
						self_signed: x.self_signed === true,
						keychain: str(x.keychain),
						sha256: str(x.sha256),
					};
				})
			: [],
		keychains: Array.isArray(r.keychains)
			? r.keychains.filter((k): k is string => typeof k === "string")
			: [],
	};
}

/**
 * Whether the reader may remove this certificate from a list: it has expired,
 * rcc said which keychain it is in and that keychain is the login one, and it
 * has a hash to be addressed by. The System keychain holds roots other
 * software trusts; an expired one there opens Keychain Access instead. An rcc
 * too old to report the hash gets no delete action at all — by name, `security
 * delete-certificate` takes the first match, and on one Mac that was a valid
 * certificate sharing its name with the expired one.
 */
export function isRemovable(cert: Certificate): boolean {
	return (
		cert.status === "expired" &&
		cert.sha256 !== "" &&
		/\/login\.keychain(-db)?$/.test(cert.keychain)
	);
}

/** Expired first, then expiring, then the rest. Alphabetical inside each. */
export function byUrgency(a: Certificate, b: Certificate): number {
	const rank = (c: Certificate) =>
		c.status === "expired" ? 0 : c.status === "expiring" ? 1 : 2;
	return rank(a) - rank(b) || a.name.localeCompare(b.name);
}
