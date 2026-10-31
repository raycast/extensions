/** The configured magpie binary cannot be resolved or does not exist. */
export class MagpieNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MagpieNotFound";
  }
}

/** magpie ran and exited with an error, or the call timed out. */
export class MagpieFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MagpieFailed";
  }
}
