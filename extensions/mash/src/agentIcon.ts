/** The icon an agent is shown with in lists, sidebars and actions. */
import { Icon, type Image } from "@raycast/api";
import { agentLogo } from "./mash";

/**
 * The agent's logo on a tile in its colour, as the Mash dashboard draws it:
 * assets/agent-tiles holds a light and a dark version of each.
 */
export function agentIcon(agent: string): Image.ImageLike {
  const name = agentLogo(agent);
  if (!name) return Icon.Message;
  return { source: { light: `agent-tiles/${name}-light.svg`, dark: `agent-tiles/${name}-dark.svg` } };
}
