interface Secret {
	username: string;
	issuer: string;
	algorithm: string;
	digits: number;
	period: string;
	tags: string[];
	notes: string;
	secret: string;
}

interface SecretData {
	[serviceName: string]: Secret[];
}

interface JsonFormat {
	service_name: string;
	current_totp: string;
	current_totp_time_remaining: number;
	next_totp: string;
	username?: string;
	algorithm: string;
	digits: number;
	period: string;
	tags: string[];
	notes: string;
}

export type { JsonFormat, Secret, SecretData };
