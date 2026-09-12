export class AnkiError extends Error {
  public readonly action: string;

  constructor(message: string, action: string) {
    super(message);
    this.name = 'AnkiError';
    this.action = action;

    // This line is necessary for proper prototype chain inheritance in TypeScript
    Object.setPrototypeOf(this, AnkiError.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
    };
  }
}
