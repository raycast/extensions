export class WiseHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    message: string,
  ) {
    super(message);
    this.name = "WiseHttpError";
  }
}

export class ScaRequiredError extends Error {
  readonly sca = true as const;
  constructor(message = "Wise requires SCA (RSA signing) for this endpoint") {
    super(message);
    this.name = "ScaRequiredError";
  }
}

export function isScaError(e: unknown): e is ScaRequiredError {
  return (
    e instanceof ScaRequiredError || (typeof e === "object" && e !== null && (e as { sca?: boolean }).sca === true)
  );
}

export function isAuthError(e: unknown): boolean {
  return e instanceof WiseHttpError && e.status === 401;
}

export function isRateLimitError(e: unknown): boolean {
  return e instanceof WiseHttpError && e.status === 429;
}
