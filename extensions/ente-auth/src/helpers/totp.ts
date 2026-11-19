import * as OTPAuth from "otpauth";
import type { Secret } from "./types";

export const generateTotpCodes = (item: Secret, timestamp = Date.now()) => {
	const importedPeriod = Number(item.period);
	const period = Number.isSafeInteger(importedPeriod) && importedPeriod > 0 ? importedPeriod : 30;
	const totp = new OTPAuth.TOTP({
		secret: item.secret,
		algorithm: item.algorithm || "SHA1",
		digits: item.digits || 6,
		period,
	});

	return {
		currentTotp: totp.generate({ timestamp }),
		currentTotpTimeRemaining: period - (Math.floor(timestamp / 1000) % period),
		nextTotp: totp.generate({ timestamp: timestamp + period * 1000 }),
		period,
	};
};
