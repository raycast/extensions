import { isServerRunning, fetchServerStatus, formatUptime } from "../lib/omlx";

export default async function () {
  const running = await isServerRunning();
  if (!running) {
    return { running: false, message: "oMLX server is not running" };
  }

  const status = await fetchServerStatus();
  return {
    running: true,
    version: status.version,
    uptime: formatUptime(status.uptime_seconds),
    modelsLoaded: status.models_loaded,
    modelsDiscovered: status.models_discovered,
    loadedModels: status.loaded_models,
    activeRequests: status.active_requests,
    totalRequests: status.total_requests,
    avgPrefillTps: status.avg_prefill_tps,
    avgGenerationTps: status.avg_generation_tps,
    cacheEfficiency: status.cache_efficiency,
    memoryUsed: status.model_memory_used_formatted,
    memoryMax: status.model_memory_max_formatted,
  };
}
