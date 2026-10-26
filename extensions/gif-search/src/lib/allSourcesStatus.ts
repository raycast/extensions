import type { ServiceName } from "../preferences";

export type SourceState = { isLoading: boolean; error?: Error; count: number };

export function getAllSourcesStatus(services: ServiceName[], states: Partial<Record<ServiceName, SourceState>>) {
  // A source that hasn't reported yet counts as loading, so the empty state doesn't flash.
  const isLoading = services.some((service) => states[service]?.isLoading ?? true);
  const failed = services.filter((service) => states[service]?.error);

  return {
    isLoading,
    failed,
    isEmpty: !isLoading && services.every((service) => states[service]?.count === 0),
    allFailed: !isLoading && failed.length === services.length,
  };
}
