/** Auth failures the UI can act on. Pure (no Raycast imports) so token logic stays unit-testable. */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly reason: "not-configured" | "signed-out" | "refresh-failed" | "worker",
  ) {
    super(message);
    this.name = "AuthError";
  }
}
