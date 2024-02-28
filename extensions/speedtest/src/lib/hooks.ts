import { useState, useEffect } from "react";
import { ensureCLI } from "./cli";
import { Result, ResultProgress, runSpeedTest } from "./speedtest";

export function useSpeedtest(): {
  result: Result;
  error: string | undefined;
  isLoading: boolean;
  resultProgress: ResultProgress;
  revalidate: () => void;
} {
  const [result, setResult] = useState<Result>({
    isp: undefined,
    location: undefined,
    serverName: undefined,
    download: undefined,
    upload: undefined,
    ping: undefined,
    url: undefined,
    error: undefined,
  });
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [date, setDate] = useState<Date>();
  const [resultProgress, setResultProgress] = useState<ResultProgress>({
    download: undefined,
    upload: undefined,
    ping: undefined,
  });
  const revalidate = () => {
    setDate(new Date());
    setIsLoading(true);
  };
  let cancel = false;
  useEffect(() => {
    async function runTest() {
      try {
        await ensureCLI();
        runSpeedTest(
          (r: Result) => {
            if (!cancel) {
              setResult({ ...r });
            }
          },
          (r: Result) => {
            if (!cancel) {
              setResult({ ...r });
              setIsLoading(false);
            }
          },
          (err: Error) => {
            if (!cancel) {
              setError(err.message);
              setIsLoading(false);
            }
          },
          (prog: ResultProgress) => {
            if (!cancel) {
              setResultProgress(prog);
            }
          },
        );
      } catch (err) {
        if (!cancel) {
          setError(err instanceof Error ? err.message : "Unknown Error");
          setIsLoading(false);
        }
      }
    }
    runTest();
    return () => {
      cancel = true;
    };
  }, [date]);
  return { result, error, isLoading, resultProgress, revalidate };
}
