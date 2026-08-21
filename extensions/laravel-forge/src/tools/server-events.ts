import { Server } from "../api/Server";
import { findServer, tail } from "./helpers";

type Input = {
  /**
   * Name of the server, as shown in Forge.
   */
  server: string;
  /**
   * Id of a specific event to read the command output of. Leave empty to list recent events.
   */
  eventId?: number;
};

export default async function tool({ server, eventId }: Input) {
  const { server: found, token } = await findServer(server);

  if (eventId) {
    const output = await Server.getEventOutput({ server: found, token, eventId });
    return { server: found.name, eventId, output: tail(output) };
  }

  const events = await Server.getEvents({ server: found, token });
  return events.map((event) => ({
    id: event.id,
    description: event.description,
    ranAs: event.ran_as,
    createdAt: event.created_at,
  }));
}
