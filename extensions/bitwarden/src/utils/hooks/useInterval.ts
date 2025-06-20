import { useEffect, useRef } from "react";

type UseIntervalProps = {
  interval?: number;
  skip?: boolean;
};

export const useInterval = (task: () => MaybePromise<void>, options?: UseIntervalProps) => {
  const { interval = 60 * 1000, skip = false } = options ?? {};
  // @ts-expect-error: To keep the original code
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (skip) return;

    const startSync = async () => {
      await task();
      timerRef.current = setInterval(task, interval);
    };

    void startSync();

    return () => clearInterval(timerRef.current);
  }, [interval, skip]);

  return { clearInterval: () => clearInterval(timerRef.current) };
};
