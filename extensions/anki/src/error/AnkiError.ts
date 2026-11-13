export class AnkiError extends Error {
  public readonly action: string;

  public readonly cause?: unknown;

  constructor(message: string, action: string, cause?: unknown) {
    super(message);
    this.name = 'AnkiError';
    this.action = action;
    this.cause = cause;

    // This line is necessary for proper prototype chain inheritance in TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
    };
  }
}

export class AnkiUncertainError extends AnkiError {
  constructor(action: string, cause: unknown) {
    super(
      `Could not confirm whether Anki completed ${action}. The action may have succeeded. Check Anki before trying again.`,
      action,
      cause
    );
    this.name = 'AnkiUncertainError';
  }
}
