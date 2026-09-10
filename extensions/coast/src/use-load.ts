import { useEffect, useState } from "react";

export function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [completedFor, setCompletedFor] = useState<{
    load: () => Promise<T>;
    revision: number;
  }>();
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(undefined);
    setError(undefined);
    load()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setCompletedFor({ load, revision });
        }
      });
    return () => {
      active = false;
    };
  }, [load, revision]);
  return {
    data:
      completedFor?.load === load && completedFor.revision === revision
        ? data
        : undefined,
    error:
      completedFor?.load === load && completedFor.revision === revision
        ? error
        : undefined,
    isLoading:
      isLoading ||
      completedFor?.load !== load ||
      completedFor.revision !== revision,
    retry: () => setRevision((value) => value + 1),
  };
}
