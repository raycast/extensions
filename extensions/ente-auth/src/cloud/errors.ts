export class CloudError extends Error {
	constructor(
		public readonly kind:
			| "network"
			| "unauthorized"
			| "invalid"
			| "cancelled"
			| "verification"
			| "unsupported",
		message: string
	) {
		super(message);
	}
}

export const invalidData = () =>
	new CloudError("invalid", "Ente data could not be read. The saved cache was not changed.");

export function safeMessage(error: unknown): string {
	return error instanceof CloudError ? error.message : "The operation failed. Try again.";
}
