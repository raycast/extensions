import { useCallback, useState } from "react";

const useLoading = (initialState: boolean) => {
  const [isLoading, setIsLoading] = useState(initialState);

  const start = useCallback(() => setIsLoading(true), []);
  const stop = useCallback(() => setIsLoading(false), []);

  return {
    start,
    stop,
    status: isLoading,
  };
};

export default useLoading;
