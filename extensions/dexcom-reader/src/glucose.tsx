// fetchGlucoseData.tsx
import {
  List,
  LocalStorage,
  getPreferenceValues,
  ActionPanel,
  Action,
  openCommandPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { usDexcomDataURL, dexcomDataURL } from "./constants";
import { LoadingState } from "./types";
import { showFailureToast } from "@raycast/utils";
import { authenticateWithDexcom } from "./api/auth";
import { fetchGlucoseData } from "./api/fetchGlucoseData";
import { AxiosResponse } from "axios";

interface Preferences {
  accountName: string;
  password: string;
  isNorthAmerica: boolean;
}

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
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        let sessionId = await LocalStorage.getItem<string>("sessionId");

        if (!sessionId) {
          sessionId = await authenticateWithDexcom(
            preferences.accountName,
            preferences.password,
            preferences.isNorthAmerica,
          );

          if (!sessionId) {
            setLoadingState(LoadingState.Error);
            setErrorMessage("Failed to authenticate with Dexcom");
            return;
          }
        }

        setLoadingState(LoadingState.Loading);

        const dexcomUrl = preferences.isNorthAmerica
          ? usDexcomDataURL
          : dexcomDataURL;

        const response: AxiosResponse = await fetchGlucoseData(
          sessionId,
          dexcomUrl,
        );

        if (response.status !== 200) {
          setLoadingState(LoadingState.Error);
          setErrorMessage(`Error fetching data: ${response.statusText}`);
          throw new Error(`Error fetching data: ${response.statusText}`);
        }

        setGlucoseData(response.data);
        setLoadingState(LoadingState.Success);
      } catch (error) {
        await showFailureToast({
          title: "Error fetching glucose data",
          message: String(error),
        });
        setLoadingState(LoadingState.Error);
        setErrorMessage(String(error));
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
          actions={
            <ActionPanel>
              <Action
                title="Update Credentials"
                onAction={openCommandPreferences}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
