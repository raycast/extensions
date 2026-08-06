export class AbortedError extends Error {
  constructor() {
    super("Operation aborted");
  }
}
