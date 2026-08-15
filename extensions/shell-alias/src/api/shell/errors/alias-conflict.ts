export class AliasConflictError extends Error {
  constructor(readonly name: string) {
    super(`An alias with the name ${name} already exists`);
  }
}
