import { environment } from "@raycast/api";
import {
  TelemetryRecorderProvider,
  TelemetryExporter,
  TelemetryEventInput,
  defaultEventRecordingOptions,
  NoOpTelemetryExporter,
} from "@sourcegraph/telemetry";
import { Sourcegraph } from "../sourcegraph";
import { useRecordEventsMutation, RecordEventsMutationOptions } from "../sourcegraph/gql/operations";

class Provider extends TelemetryRecorderProvider<"", ""> {}

class Exporter implements TelemetryExporter {
  private events: TelemetryEventInput[] = [];

  constructor(private recordEvents: (input: RecordEventsMutationOptions) => void) {}

  exportEvents(events: TelemetryEventInput[]): Promise<void> {
    console.debug("exportEvents", events);
    this.recordEvents({ variables: { events } });
    return Promise.resolve();
  }

  /**
   * Retrieve all events that have been "exported" so far.
   */
  getExported(): TelemetryEventInput[] {
    return this.events;
  }
}

export function useTelemetry(src: Sourcegraph) {
  const options = { client: "raycast.sourcegraph" };

  if (
    src.featureFlags.disableTelemetry ||
    // comment this line out to test telemetry in development
    environment.isDevelopment
  ) {
    // do not export any telemetry
    const exporter = new NoOpTelemetryExporter();
    const provider = new Provider(options, exporter, undefined, defaultEventRecordingOptions);
    return {
      recorder: provider.getRecorder(),
    };
  }

  const [recordEvents, { error }] = useRecordEventsMutation({ client: src.client });
  if (error) {
    // not very important, don't show to the user
    console.error("Error recording telemetry events", { error });
  }

  const exporter = new Exporter(recordEvents);
  const provider = new Provider(options, exporter, undefined, defaultEventRecordingOptions);

  return {
    recorder: provider.getRecorder(),
  };
}
