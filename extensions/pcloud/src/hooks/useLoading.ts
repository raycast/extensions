import { useCallback, useEffect, useState } from "react";

type UseLoadingProps = {
  initialValue?: boolean;
};
export function useLoading(props: UseLoadingProps = {}) {
  const { initialValue } = props;
  const [loading, setLoading] = useState<boolean>(initialValue ?? false);
  const withLoading = useCallback((action: Promise<unknown>) => {
    setLoading(true);
    return action
      .catch(() => {
        setLoading(false);
        return Promise.reject();
      })
      .finally(() => {
        setLoading(false);
        return Promise.resolve();
      });
  }, []);
  const finishLoading = () => {
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      setLoading(initialValue as boolean);
    };
  }, [initialValue]);

  return {
    loading,
    setLoading,
    finishLoading,
    withLoading,
  };
}
