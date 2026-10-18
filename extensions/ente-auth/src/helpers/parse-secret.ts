import * as OTPAuth from "otpauth";
import { URL } from "node:url";
import { Secret } from "./types";

export function parseSecretURL(input: string): Secret | null {
	const source = new URL(input);
	if (source.protocol === "otpauth:" && ["hotp", "steam"].includes(source.hostname.toLowerCase())) {
		return null;
	}

	// Secrets from Blesta seem to end up malformed at times
	const url = input
		// Fix HTML entity + URL encoding corruption (&amp%3B → &)
		.replace(/&amp%3B/g, "&")
		// Fix double URL encoding (%25XX → %XX)
		.replace(/%25([0-9A-Fa-f]{2})/g, "%$1")
		// Fix bare issuer parameters (`&issuer&` → `&issuer=&`) emitted by some Ente Auth exports.
		.replace(/([?&]issuer)(?=&|$)/g, "$1=")
		// Normalize null OTP parameters from Ente exports.
		.replace(/([?&])period=null(?=&|$)/g, "$1period=30")
		.replace(/([?&])(algorithm|digits)=null(?=&|$)/g, "$1")
		.replace(/([?&]algorithm=)Algorithm\./gi, "$1")
		// Remove empty parameters left by these repairs.
		.replace(/\?&/g, "?")
		.replace(/&&+/g, "&")
		.replace(/[?&]$/, "")
		// Ente sometimes adds whitespace, dashes, and plus signs to secrets. Decode before removing them.
		.replace(
			/([?&]secret=)([^&]+)/g,
			(_, prefix, secret) => prefix + encodeURIComponent(decodeURIComponent(secret).replace(/[\s\-+]/g, ""))
		);

	const totp = OTPAuth.URI.parse(url);
	if (!(totp instanceof OTPAuth.TOTP)) {
		throw new Error("Only TOTP entries are supported");
	}

	const params = new URL(url).searchParams;
	const display = params.get("codeDisplay");
	const metadata = display ? JSON.parse(display) : null;
	if (
		(metadata !== null && (typeof metadata !== "object" || Array.isArray(metadata))) ||
		(metadata?.trashed != null && typeof metadata.trashed !== "boolean") ||
		(metadata?.tags != null &&
			(!Array.isArray(metadata.tags) || !metadata.tags.every((tag: unknown) => typeof tag === "string"))) ||
		(metadata?.note != null && typeof metadata.note !== "string") ||
		!Number.isSafeInteger(totp.period) ||
		totp.period <= 0 ||
		!Number.isSafeInteger(totp.digits) ||
		totp.digits < 1 ||
		totp.digits > 10
	) {
		throw new Error("Invalid TOTP entry");
	}

	if (metadata?.trashed) {
		return null;
	}

	// Validate the algorithm and secret before a cloud snapshot can be saved.
	totp.generate({ timestamp: 0 });

	return {
		username: totp.label,
		issuer: totp.issuer,
		algorithm: totp.algorithm,
		digits: totp.digits,
		period: String(totp.period),
		tags: metadata?.tags?.map((tag: string) => tag.trim()) ?? [],
		notes: metadata?.note ?? "",
		secret: totp.secret.base32,
	};
}
