import * as OTPAuth from "otpauth";
import { JsonFormat, Secret } from "./types";

export const mapSecretsToJsonFormat = (items: Secret[], timestamp = Date.now()): JsonFormat[] =>
	items.flatMap((item) => {
		try {
			const totp = new OTPAuth.TOTP({
				secret: item.secret,
				algorithm: item.algorithm || "SHA1",
				digits: item.digits || 6,
				period: Number(item.period) || 30,
			});
			return [
				{
					id: item.id,
					username: item.username,
					service_name: item.issuer.replace(/\+/g, " "),
					algorithm: totp.algorithm,
					digits: totp.digits,
					period: String(totp.period),
					tags: item.tags,
					notes: item.notes,
					current_totp: totp.generate({ timestamp }),
					current_totp_time_remaining: totp.period - (Math.floor(timestamp / 1000) % totp.period),
					next_totp: totp.generate({ timestamp: timestamp + totp.period * 1000 }),
				},
			];
		} catch {
			console.error("A TOTP entry could not be read. Check its settings in Ente Auth and the device clock.");
			return [];
		}
	});
