import { Data } from "effect";

export class EmptyClipboardError extends Data.Error<{
  readonly _tag: "EmptyClipboardError";
}> {}

export class InvalidUrlError extends Data.Error<{
  readonly _tag: "InvalidUrlError";
  readonly input: string;
}> {}

export class AuthError extends Data.Error<{
  readonly _tag: "AuthError";
}> {}

export class ConnectionError extends Data.Error<{
  readonly _tag: "ConnectionError";
  readonly message: string;
}> {}

export class ServerError extends Data.Error<{
  readonly _tag: "ServerError";
  readonly url: string;
  readonly statusCode: number;
}> {}

export class ValidationError extends Data.Error<{
  readonly _tag: "ValidationError";
  readonly message: string;
}> {}
