export class TransformError extends Error {
  constructor(message: string, inner?: Error) {
    super(message);

    Object.defineProperty(this, "inner", {
      value: inner,
    });

    Error.captureStackTrace(this, this.constructor);
  }
}
