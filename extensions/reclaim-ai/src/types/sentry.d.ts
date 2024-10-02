import { captureException, startSpan } from "@sentry/node";

declare module "@sentry/node" {
  export type StartSpanOptions = Parameters<typeof startSpan>[0];
  export type StartSpanOptions = Parameters<typeof startSpan>[0];
  export type ExclusiveEventHintOrCaptureContext = NonNullable<Parameters<typeof captureException>[1]>;
}
