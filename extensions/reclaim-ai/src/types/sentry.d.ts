import { captureException, startSpan } from "@sentry/react";

declare module "@sentry/react" {
  export type StartSpanOptions = Parameters<typeof startSpan>[0];
  export type StartSpanOptions = Parameters<typeof startSpan>[0];
  export type ExclusiveEventHintOrCaptureContext = NonNullable<Parameters<typeof captureException>[1]>;
}
