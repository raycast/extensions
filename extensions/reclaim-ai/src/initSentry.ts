import * as Sentry from "@sentry/react";

const client = Sentry.init({
  environment: "production",
  dsn: "https://5134f342dc16c6d8d97c46c6b42a7cb1@o338527.ingest.us.sentry.io/4508048193224704",
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions

  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});

console.log("========>", client?.getDsn());
