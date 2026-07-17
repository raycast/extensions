import { fetchChannels } from "../lib/buffer";
import { serviceLabel } from "../lib/format";

/**
 * Lists the connected Buffer channels. The AI should call this first when the
 * user refers to a channel by name, to resolve it to a channel id.
 */
export default async function () {
  const channels = await fetchChannels();
  return channels.map((c) => ({
    id: c.id,
    name: c.displayName || c.name,
    network: serviceLabel(c.service),
  }));
}
