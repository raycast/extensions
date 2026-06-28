export const WinSCPErrorCode = {
  WINSCP_NOT_FOUND: "winscp_not_found",
  UNKNOWN_ERROR: "unknown_error",
} as const;
type WinSCPErrorCode = (typeof WinSCPErrorCode)[keyof typeof WinSCPErrorCode];

export class WinSCPError extends Error {
  constructor(
    public code: WinSCPErrorCode,
    public extra?: string,
  ) {
    super(`${code}${extra !== undefined ? `: ${extra}` : ""}`);
  }
}
