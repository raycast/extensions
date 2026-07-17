import { JsonFormat, Secret } from "../helpers/types";

export const dataTransformer = (
	username: string,
	serviceName: string,
	algorithm: string,
	digits: number,
	period: string,
	tags: string[],
	notes: string,
	currentTotp: string,
	currentTotpTimeRemaining: number,
	nextTotp: string
): JsonFormat => {
	return {
		username,
		service_name: serviceName.replace(/\+/g, " "),
		algorithm,
		digits,
		period,
		tags,
		notes,
		current_totp: currentTotp,
		current_totp_time_remaining: currentTotpTimeRemaining,
		next_totp: nextTotp,
	};
};

export const getAllSecretNames = (data: Secret[]): string[] => Object.keys(data);
