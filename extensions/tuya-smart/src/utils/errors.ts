/**
 * Tuya answers with HTTP 200 even when a call fails; the outcome lives in the
 * `success` flag of the response envelope. Nothing in the transport layer rejects,
 * so failures have to be turned into real errors explicitly.
 */
export class TuyaApiError extends Error {
  readonly code: number;
  readonly tuyaMessage: string;

  constructor(code: number, tuyaMessage: string) {
    super(`Tuya API error ${code}: ${tuyaMessage}`);
    this.name = "TuyaApiError";
    this.code = code;
    this.tuyaMessage = tuyaMessage;
  }
}

export function isTuyaApiError(error: unknown): error is TuyaApiError {
  return error instanceof TuyaApiError;
}
