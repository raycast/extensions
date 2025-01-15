import { environment } from '@raycast/api';

export const logger = {
	log: (...args: unknown[]) => {
		if (environment.isDevelopment) {
			console.log(new Date().toISOString(), ...args);
		}
	},
	error: (...args: unknown[]) => {
		if (environment.isDevelopment) {
			console.error(new Date().toISOString(), ...args);
		}
	},
};
