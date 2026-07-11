import { useEffect, useState } from "react";
import { readFileSync } from "fs";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { SensibleSDK, type ExtractionResult } from "sensible-api";

type Extraction = {
  data: ExtractionResult | undefined;
  error?: string;
  isLoading: boolean;
};

export default function useExtraction(documentType?: string, file?: string): Extraction {
  const { sensible_api_key } = getPreferenceValues<ExtensionPreferences>();

  const [extraction, setExtraction] = useState<Extraction>({ data: undefined, error: undefined, isLoading: true });

  useEffect(() => {
    if (!sensible_api_key) return;
    const sensible = new SensibleSDK(sensible_api_key);
    const fetchData = async () => {
      if (!documentType || !file) return { data: undefined, error: undefined, isLoading: false };
      const request = await sensible.extract({
        file: readFileSync(file),
        documentType,
        environment: "production",
      });
      const result = await sensible.waitFor(request);

      return result;
    };

    fetchData()
      .catch(async (error) => {
        await showToast({ style: Toast.Style.Failure, title: "Failed", message: error });
      })
      .then((response) => {
        if (response && "parsed_document" in response) {
          setExtraction({ data: response, error: undefined, isLoading: false });
        }
      });
  }, [documentType, file, sensible_api_key, extraction]);

  return { data: extraction.data, error: extraction.error, isLoading: extraction.isLoading };
}
