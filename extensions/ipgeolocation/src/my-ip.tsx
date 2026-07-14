import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { IPData, Preferences } from "./types";
import { fetchIPData } from "./utils/api";
import { IPDetail } from "./components/ip-detail";

export default function MyIP() {
  const { apiKey, plan } = getPreferenceValues<Preferences>();
  const [data, setData] = useState<IPData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchIPData("", apiKey, plan)
      .then(setData)
      .catch((e) =>
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to get your IP",
          message: String(e),
        }),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return <IPDetail data={data} isLoading={isLoading} />;
}
