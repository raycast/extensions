import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getConfig } from "../utils/getConfig";
import { PaperRawData } from "../types";

export function useGetConfig() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [paperDataRaw, setPaperDataRaw] = useState<PaperRawData | null>(null);

  useEffect(() => {
    const getPaper = async () => {
      const paperConfig = await getConfig();

      if (paperConfig instanceof Error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: paperConfig.message,
        });
        return;
      }

      setPaperDataRaw(JSON.parse(paperConfig));
      setIsLoading(false);
    };

    getPaper();
  }, []);

  return {
    isLoading,
    paperDataRaw,
    setPaperDataRaw,
  };
}
