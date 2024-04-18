import { useCallback, useState } from "react";
import fetch from "node-fetch";
import { randomUUID } from "crypto";
import { showFailureToast } from "@raycast/utils";

import { getPreferenceValues } from "@raycast/api";
import { GeneratedImage, ImageGenerationModel } from "../lib/image";

const generateImages = (prompt: string, model: ImageGenerationModel) => {
  const preferences = getPreferenceValues<Preferences.Image>();
  const requests = new Array(Number(preferences.numberOfImages)).fill(async () => {
    const payload = {
      cfg_scale: Number(preferences.cfgScale),
      height: preferences.height,
      width: preferences.width,
      steps: Number(preferences.steps),
      engine: model,
      text_prompts: [{ text: prompt }],
    };
    try {
      const response = await fetch("https://api.corcel.io/v1/image/vision/text-to-image", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          Authorization: preferences.apiKey,
        },
        body: JSON.stringify(payload),
      });
      const res = (await response.json()) as { signed_urls: string[] };
      if (res.signed_urls) {
        const returnData: GeneratedImage = {
          id: randomUUID(),
          url: res.signed_urls[0],
          config: {
            cfg_scale: payload.cfg_scale,
            height: payload.height,
            width: payload.height,
            steps: payload.steps,
            engine: payload.engine,
            prompt: payload.text_prompts[0].text,
          },
          created_on: new Date().toISOString(),
        };
        return returnData;
      } else {
        // TODO - Properly type this
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error((res as any).message || "An error occured");
      }
    } catch (error) {
      throw new Error(error as { message: string }["message"]);
    }
  });
  return Promise.all(requests.map((req) => req()));
};

export const useGenerateImage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<GeneratedImage[]>();
  const [errorMessage, setErrorMessage] = useState("");

  const generate = useCallback(async (prompt: string, model: ImageGenerationModel) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const generatedImages = await generateImages(prompt, model);
      setData(generatedImages);
    } catch (error) {
      const errorMessage = (error as { message: string }).message;
      showFailureToast(errorMessage);
      setErrorMessage(errorMessage);
    }

    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setData(undefined);
    setErrorMessage("");
  }, []);

  return { generate, isLoading, data, errorMessage, reset };
};
