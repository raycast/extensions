import { Server } from "../api/Server";
import { dropOnMiss } from "../lib/coordinates";
import { serverRecord } from "../lib/records";
import { tail } from "./helpers";

type Input = {
  /**
   * A server id from list-servers, for example 678350.
   */
  serverId: number;
  /**
   * Id of one event to read the output of. Leave empty to list recent events.
   */
  eventId?: number;
};

export default async function tool({ serverId, eventId }: Input) {
  const { server, account } = await serverRecord(serverId);

  if (eventId) {
    const output = await dropOnMiss("server", serverId, () =>
      Server.getEventOutput({ server, token: account.token, eventId }),
    );
    return { server: server.name, eventId, output: tail(output) };
  }

  const events = await dropOnMiss("server", serverId, () => Server.getEvents({ server, token: account.token }));
  return {
    note: events.length
      ? "Pass an id back as eventId to read that event's output."
      : "Forge has no recent events for this server.",
    events: events.map((event) => ({
      id: event.id,
      description: event.description,
      ranAs: event.ran_as,
      createdAt: event.created_at,
    })),
  };
}
