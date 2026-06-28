import { captureException, EventHint } from "@sentry/node";

declare module "@sentry/node" {
  export type ExclusiveEventHintOrCaptureContext = NonNullable<Parameters<typeof captureException>[1]>;
  export type Attachment = NonNullable<EventHint["attachments"]>[number];
}
