// fetchGlucoseData.tsx
import { List, LocalStorage } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import { usDexcomDataURL, dexcomDataURL } from "./constants";
import { LoadingState } from "./types";
import { showFailureToast } from "@raycast/utils";

interface GlucoseData {
  WT: string;
  ST: string;
  DT: string;
  Value: number;
  Trend: string;
}

export default function FetchGlucoseData() {
  const [glucoseData, setGlucoseData] = useState<GlucoseData[]>([]);
  const [loadingState, setLoadingState] = useState(LoadingState.Loading);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionId = await LocalStorage.getItem<string>("sessionId");
        const isNorthAmerica =
          await LocalStorage.getItem<boolean>("isNorthAmerica");
        if (!sessionId || !isNorthAmerica) {
          setLoadingState(LoadingState.Error);
          setErrorMessage(
            "Session ID or region not found, please authenticate.",
          );
          await showFailureToast({
            title: "Session ID or region not found",
            message: "Please authenticate.",
          });
          setLoadingState(LoadingState.Error);
          return;
        }

        setLoadingState(LoadingState.Loading);
        const response = await axios.post(
          isNorthAmerica ? usDexcomDataURL : dexcomDataURL,
          {
            sessionId,
            minutes: 1440,
            maxCount: 200,
          },
        );

        if (response.status !== 200) {
          setLoadingState(LoadingState.Error);
          setErrorMessage(`Error fetching data: ${response.statusText}`);
          throw new Error(`Error fetching data: ${response.statusText}`);
        }

        setGlucoseData(response.data);
        setLoadingState(LoadingState.Success);
      } catch (error) {
        console.error("Failed to fetch glucose data:", error);
        await showFailureToast({
          title: "Error fetching glucose data",
          message: String(error),
        });
      }
    };

    fetchData();
  }, []);

  const TREND_VALUE_MAPPING = {
    None: "",
    DoubleUp: "⬆️⬆️",
    SingleUp: "⬆️",
    FortyFiveUp: "↗️",
    Flat: "➡️",
    FortyFiveDown: "↘️",
    SingleDown: "⬇️",
    DoubleDown: "⬇️⬇️",
    NotComputable: "🤷‍♂️",
    RateOutOfRange: "💣",
  };

  if (loadingState === LoadingState.Error) {
    return (
      <List>
        <List.Item title="Error" subtitle={errorMessage ?? "Unknown error"} />
      </List>
    );
  }

  return (
    <List isLoading={loadingState === LoadingState.Loading}>
      {glucoseData.map((data) => (
        <List.Item
          key={data.DT}
          title={`${data.Value} ${TREND_VALUE_MAPPING[data.Trend as keyof typeof TREND_VALUE_MAPPING]}`}
          subtitle={new Date(
            parseInt(data.DT.match(/\d+/)?.[0] ?? "0", 10),
          ).toLocaleString()}
        />
      ))}
    </List>
  );
}
