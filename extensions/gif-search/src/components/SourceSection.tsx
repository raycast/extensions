import { useEffect } from "react";

import useSearchAPI from "../hooks/useSearchAPI";
import { getServiceTitle, ServiceName } from "../preferences";
import { GifGridSection } from "./GifGridSection";

export type SourceState = { isLoading: boolean; error?: Error; count: number };

interface SourceSectionProps {
  service: ServiceName;
  term: string;
  limit: number;
  onStateChange: (service: ServiceName, state: SourceState) => void;
  mutate: () => Promise<void>;
}

// Each provider fetches on its own, so a slow or failing one doesn't hold back the others.
export function SourceSection({ service, term, limit, onStateChange, mutate }: SourceSectionProps) {
  const { data, isLoading, error } = useSearchAPI({ term, service, limit });
  const results = error ? [] : (data ?? []).slice(0, limit);

  useEffect(() => {
    onStateChange(service, { isLoading, error, count: results.length });
  }, [onStateChange, service, isLoading, error, results.length]);

  return <GifGridSection title={getServiceTitle(service)} results={results} service={service} mutate={mutate} />;
}
