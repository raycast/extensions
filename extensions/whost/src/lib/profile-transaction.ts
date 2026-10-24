export class ProfilesRollbackError extends Error {
  readonly applyError: unknown;
  readonly rollbackError: unknown;

  constructor(applyError: unknown, rollbackError: unknown) {
    super(
      "The hosts file update failed and the saved profile changes could not be rolled back.",
    );
    this.name = "ProfilesRollbackError";
    this.applyError = applyError;
    this.rollbackError = rollbackError;
  }
}

export function commitProfilesTransaction<T>(
  previous: T,
  next: T,
  save: (profiles: T) => void,
  apply: (profiles: T) => void,
): void {
  save(next);
  try {
    apply(next);
  } catch (applyError) {
    try {
      save(previous);
    } catch (rollbackError) {
      throw new ProfilesRollbackError(applyError, rollbackError);
    }
    throw applyError;
  }
}
