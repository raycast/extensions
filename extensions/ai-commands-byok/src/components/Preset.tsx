import { Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getCommand } from "../lib/store";
import { RunView } from "./RunView";

/** A preset exposed as its own root-search command, so it can take a hotkey directly. */
export function Preset({ id }: { id: string }) {
  const { data, isLoading } = useCachedPromise(getCommand, [id]);
  if (isLoading || !data) return <Detail isLoading={isLoading} markdown="" />;
  return <RunView command={data} />;
}
