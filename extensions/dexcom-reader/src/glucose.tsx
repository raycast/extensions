// fetchGlucoseData.tsx
import { List, LocalStorage, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  usDexcomDataURL,
  dexcomDataURL,
  TREND_VALUE_MAPPING,
} from "./constants";
import { GlucoseData, LoadingState } from "./types";
import { showFailureToast } from "@raycast/utils";
import { authenticateWithDexcom } from "./api/auth";
import { fetchGlucoseData } from "./api/fetchGlucoseData";
import { AxiosResponse } from "axios";
import { UpdateCredentialsAction } from "./actions";

export default function FetchGlucoseData() {
  const [glucoseData, setGlucoseData] = useState<GlucoseData[]>([]);
  const [loadingState, setLoadingState] = useState(LoadingState.Loading);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    let retries = 0;
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
      if (retries < 2) {
        retries++;
        const sessionId = await authenticateWithDexcom(
          preferences.accountName,
          preferences.password,
          preferences.isNorthAmerica,
        );
        LocalStorage.setItem("sessionId", sessionId!);
        fetchData();
      } else {
        await showFailureToast({
          title: "Error fetching glucose data",
          message: String(error),
        });
        setLoadingState(LoadingState.Error);
        setErrorMessage(String(error));
      }
    }
  };

  if (loadingState === LoadingState.Error) {
    return (
      <List>
        <List.Item
          title="Error"
          subtitle={errorMessage ?? "Unknown error"}
          actions={<UpdateCredentialsAction fetchData={fetchData} />}
        />
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
          actions={<UpdateCredentialsAction fetchData={fetchData} />}
        />
      ))}
    </List>
  );
}
