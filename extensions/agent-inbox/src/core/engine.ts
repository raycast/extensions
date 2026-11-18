import { Store } from "./db";
import { enabledChannels } from "./notifications";
import { AgentEvent, Config } from "./types";

/** Sources only submit events. Persistence and notification policy are shared by every host. */
export class EventEngine {
  constructor(
    readonly store: Store,
    private readonly config: () => Config,
  ) {}

  ingest(event: AgentEvent, options: { silent?: boolean } = {}) {
    return this.store.record(event, { channels: enabledChannels(this.config()), ...options });
  }
}
