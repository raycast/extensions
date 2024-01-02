import { useEffect, useState } from "react";

function useLoadingTimeout(current: boolean, timeout: number) {
  const [isLoading, setIsLoading] = useState(current);

  useEffect(() => {
    if (current) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [current, timeout]);

  return isLoading;
}

export default useLoadingTimeout;
