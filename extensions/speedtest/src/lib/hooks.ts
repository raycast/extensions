import { useEffect, useState } from "react";
import { ensureCLI } from "./cli";
import { SpeedtestHandle, SpeedtestResultDefaultValue, runSpeedTest } from "./speedtest";
import { ResultProgress, SpeedSamples, SpeedtestResult } from "./speedtest.types";

const emptySamples = (): SpeedSamples => ({ download: [], upload: [] });
const emptyProgress = (): ResultProgress => ({ download: undefined, upload: undefined, ping: undefined });

export function useSpeedtest(): {
  result: SpeedtestResult;
  error?: string;
  isLoading: boolean;
  resultProgress: ResultProgress;
  samples: SpeedSamples;
  revalidate: () => void;
} {
  const [result, setResult] = useState<SpeedtestResult>({ ...SpeedtestResultDefaultValue });
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [date, setDate] = useState<Date>();
  const [resultProgress, setResultProgress] = useState<ResultProgress>(emptyProgress);
  const [samples, setSamples] = useState<SpeedSamples>(emptySamples);
  const revalidate = () => {
    setDate(new Date());
    setIsLoading(true);
    setError(undefined);
    setResult({ ...SpeedtestResultDefaultValue });
    // Also drop the phase progress, otherwise a restart after a failed upload would
    // briefly show "Uploading 80%" until the new run's first progress event arrives.
    setResultProgress(emptyProgress());
    setSamples(emptySamples());
  };
  useEffect(() => {
    // React (dev/StrictMode) and Raycast can run this effect twice for one mount. The
    // cleanup must kill the CLI, otherwise two tests run at once and Ookla's rate limit
    // ("Too many requests") is hit twice as fast.
    let cancelled = false;
    let handle: SpeedtestHandle | undefined;

    async function runTest() {
      try {
        await ensureCLI();
        if (cancelled) return;
        handle = runSpeedTest(
          (r: SpeedtestResult) => setResult((sr) => ({ ...sr, ...r })),
          (r: SpeedtestResult) => {
            setResult({ ...r });
            setIsLoading(false);
          },
          (err: Error) => {
            setError(err.message);
            setIsLoading(false);
          },
          (prog: ResultProgress) => setResultProgress(prog),
          (type, bandwidth) => setSamples((s) => ({ ...s, [type]: [...s[type], bandwidth] })),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown Error");
          setIsLoading(false);
        }
      }
    }
    runTest();
    return () => {
      cancelled = true;
      handle?.cancel();
    };
  }, [date]);
  return { result, error, isLoading, resultProgress, samples, revalidate };
}

export const useDetailedView = (): [boolean, () => void, () => void] => {
  const [isDetailedViewEnabled, setIsDetailedViewEnabled] = useState(false);
  const showDetails = () => setIsDetailedViewEnabled(true);
  const hideDetails = () => setIsDetailedViewEnabled(false);
  return [isDetailedViewEnabled, showDetails, hideDetails];
};
