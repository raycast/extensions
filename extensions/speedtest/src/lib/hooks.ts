import { useEffect, useState } from "react";
import { ensureCLI } from "./cli";
import { SpeedtestResultDefaultValue, runSpeedTest } from "./speedtest";
import { ResultProgress, SpeedtestResult } from "./speedtest.types";

export function useSpeedtest(): {
  result: SpeedtestResult;
  error?: string;
  isLoading: boolean;
  resultProgress: ResultProgress;
  revalidate: () => void;
} {
  const [result, setResult] = useState<SpeedtestResult>({ ...SpeedtestResultDefaultValue });
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
          (r: SpeedtestResult) => {
            if (!cancel) {
              setResult((sr) => ({ ...sr, ...r }));
            }
          },
          (r: SpeedtestResult) => {
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

export const useDetailedView = (): [boolean, () => void, () => void] => {
  const [isDetailedViewEnabled, setIsDetailedViewEnabled] = useState(false);
  const showDetails = () => setIsDetailedViewEnabled(true);
  const hideDetails = () => setIsDetailedViewEnabled(false);
  return [isDetailedViewEnabled, showDetails, hideDetails];
};
