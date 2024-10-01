import { captureException, startSpan } from "@sentry/node";

// https://github.com/microsoft/TypeScript/blob/main/src/lib/es2022.error.d.ts
interface ErrorOptions {
  cause?: unknown;
}

interface Error {
  cause?: unknown;
}

interface ErrorConstructor {
  new (message?: string, options?: ErrorOptions): Error;
  (message?: string, options?: ErrorOptions): Error;
}

declare module "@sentry/node" {
  export type StartSpanOptions = Parameters<typeof startSpan>[0];
  export type StartSpanOptions = Parameters<typeof startSpan>[0];
  export type ExclusiveEventHintOrCaptureContext = NonNullable<Parameters<typeof captureException>[1]>;
}
