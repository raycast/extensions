import { useCachedPromise } from "@raycast/utils";
import { loadAllPlugins } from "../lib/plugins";
import { loadAllSkills } from "../lib/skills";
import { loadAllMcpServers } from "../lib/mcp";

export function usePlugins() {
  // Load plugins and skills instantly (local file reads only)
  const {
    data: localData,
    isLoading: localLoading,
    revalidate: revalidateLocal,
  } = useCachedPromise(async () => {
    const [plugins, skills] = await Promise.all([
      loadAllPlugins(),
      loadAllSkills(),
    ]);
    return { plugins, skills };
  }, []);

  // Load MCP servers separately (slow: spawns health check processes)
  const {
    data: mcpServers,
    isLoading: mcpLoading,
    revalidate: revalidateMcp,
  } = useCachedPromise(loadAllMcpServers, []);

  const plugins = localData?.plugins ?? [];
  const enabled = plugins.filter((p) => p.enabled);
  const disabled = plugins.filter((p) => !p.enabled);

  return {
    plugins,
    enabledPlugins: enabled,
    disabledPlugins: disabled,
    skills: localData?.skills ?? [],
    mcpServers: mcpServers ?? [],
    isLoading: localLoading,
    isMcpLoading: mcpLoading,
    revalidateLocal,
    revalidateMcp,
    revalidate: () => {
      revalidateLocal();
      revalidateMcp();
    },
  };
}
