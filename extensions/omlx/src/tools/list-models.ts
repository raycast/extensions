import { fetchModelsStatus, formatBytes } from "../lib/omlx";

type Input = {
  /**
   * Filter by load state. "loaded" returns only models in memory, "available" returns only models not loaded, omit for all models.
   */
  filter?: "loaded" | "available";
};

export default async function (input: Input) {
  const models = await fetchModelsStatus();
  const filtered = models
    .filter((m) => !m.is_helper && !m.is_hidden)
    .filter((m) => {
      if (input.filter === "loaded") return m.loaded;
      if (input.filter === "available") return !m.loaded && !m.is_loading;
      return true;
    });

  return filtered.map((m) => ({
    id: m.id,
    loaded: m.loaded,
    loading: m.is_loading,
    pinned: m.pinned,
    favorite: m.is_favorite,
    type: m.model_type,
    thinking: m.thinking_default,
    size: formatBytes(m.actual_size || m.estimated_size),
    contextWindow: m.max_context_window,
  }));
}
