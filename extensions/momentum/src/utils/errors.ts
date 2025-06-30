export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError;
};

export enum Errors {
  EEXIST = "EEXIST",
  EACCES = "EACCES",
}
