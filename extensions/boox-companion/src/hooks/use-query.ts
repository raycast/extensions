import { useEffect, useRef, useState } from "react";

export function useQuery<T>(key: string, loader: () => Promise<T>, enabled = true) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [state, setState] = useState<{ key: string; data?: T; error?: unknown; isLoading: boolean }>({
    key,
    isLoading: enabled,
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setState({ key, isLoading: false });
      return () => {
        active = false;
      };
    }
    setState({ key, isLoading: true });
    loaderRef
      .current()
      .then((value) => {
        if (active) setState({ key, data: value, isLoading: false });
      })
      .catch((reason) => {
        if (active) setState({ key, error: reason, isLoading: false });
      });
    return () => {
      active = false;
    };
  }, [key, revision, enabled]);

  const current = state.key === key ? state : { key, isLoading: enabled };

  return {
    data: current.data,
    error: current.error,
    isLoading: current.isLoading,
    revalidate: () => setRevision((value) => value + 1),
  };
}
