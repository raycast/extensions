import { KeroClient, KeroError } from "./kero";
import type { Session } from "./model";
import type { NewSessionInput } from "./new-session";

type CreationClient = Pick<KeroClient, "createSession" | "focus">;
type CreationResult = { session: Session; opened: boolean };

// One form lifetime owns one request. Retain confirmed IDs before attempting
// focus, and never repeat a mutation whose result could not be confirmed.
export class SessionCreationRequest {
  private confirmed?: Session;
  private unconfirmed?: KeroError;
  private pending?: Promise<CreationResult>;

  get session() {
    return this.confirmed;
  }
  get uncertain() {
    return this.unconfirmed !== undefined;
  }

  run(
    client: CreationClient,
    input: NewSessionInput,
    callbacks: { isActive: () => boolean; onCreated: (session: Session) => void },
  ): Promise<CreationResult> {
    if (this.pending) return this.pending;
    if (this.unconfirmed) return Promise.reject(this.unconfirmed);
    this.pending = this.perform(client, input, callbacks).finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }

  private async perform(
    client: CreationClient,
    input: NewSessionInput,
    callbacks: { isActive: () => boolean; onCreated: (session: Session) => void },
  ): Promise<CreationResult> {
    if (!this.confirmed) {
      try {
        this.confirmed = await client.createSession(input);
      } catch (reason) {
        if (reason instanceof KeroError && reason.kind === "creation-uncertain") this.unconfirmed = reason;
        throw reason;
      }
      if (callbacks.isActive()) callbacks.onCreated(this.confirmed);
    }
    if (!callbacks.isActive()) return { session: this.confirmed, opened: false };
    await client.focus(this.confirmed.panes[0].id);
    return { session: this.confirmed, opened: true };
  }
}
