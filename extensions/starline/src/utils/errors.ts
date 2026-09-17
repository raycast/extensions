/* eslint max-classes-per-file: 0 */
const UNKNOWN_ERROR_MESSAGE = "Unknown error";

export class DisplayableError extends Error {}

export function getErrorMessage(error: unknown, fallback = UNKNOWN_ERROR_MESSAGE) {
    return error instanceof Error ? error.message : fallback;
}

export class CaptchaNeededError extends DisplayableError {
    constructor(
        message = "Failed to load devices items. Captcha needed.",
        readonly captchaSid?: string,
        readonly captchaImg?: string,
    ) {
        super(message);
        this.name = "CaptchaNeededError";
    }
}
