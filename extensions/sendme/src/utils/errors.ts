export class SendmeError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "SendmeError";
  }
}

export const handleError = (error: unknown): string => {
  if (error instanceof SendmeError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
};
