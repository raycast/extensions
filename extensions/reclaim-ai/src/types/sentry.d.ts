import { captureException } from "@sentry/node";

declare module "@sentry/node" {
  export type ExclusiveEventHintOrCaptureContext = NonNullable<Parameters<typeof captureException>[1]>;
}
