import axios from "axios";
import FormData from "form-data";
import { createReadStream } from "fs";
import { CreateImageRequestSizeEnum, Configuration, OpenAIApi } from "openai";
import { useCallback, useRef, useState } from "react";

import type { CreateImageRequest, ImagesResponse as AIImagesResponse, ImagesResponseDataInner } from "openai";

export type CreateVariationRequest = {
  n: number;
  size: CreateImageRequestSizeEnum;
  responseFormat?: string;
  user?: string;
};

export type ImagesResponse = {
  images?: ImagesResponseDataInner[];
  error?: Error;
};

export default function useOpenAIApi(config: { apiKey: string }) {
  const [state, setState] = useState<ImagesResponse>({});
  const [isLoading, setIsLoading] = useState(false);
  const cancelRef = useRef<AbortController | null>(null);

  const openai = new OpenAIApi(config as Configuration);

  const createImage = useCallback(
    async function createImage(requestOpt: CreateImageRequest) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);

      try {
        const { data } = await openai.createImage(requestOpt, {
          // There's a bug in the openai library where the auth header isn't being set
          // Set it manually here instead
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });

        setState({ images: data.data });
        setIsLoading(false);
      } catch (e) {
        const error = e as any;
        if (error.response) {
          setState({ error: new Error(`${error.response.status}: ${error.response.data.error.message}`) });
        } else {
          setState({ error: error.message });
        }
      }

      return () => {
        cancelRef.current?.abort();
      };
    },
    [state, cancelRef]
  );

  const createVariation = useCallback(
    async function createVariation(filePath: string, opt: CreateVariationRequest) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);

      try {
        const formData = new FormData();
        formData.append("image", createReadStream(filePath));
        opt.n && formData.append("n", opt.n);
        opt.size && formData.append("size", opt.size);

        // Another bug in the openai library, this time with how it makes the POST request using
        // axios vias the openai.createImageVariation function, so we make it ourselves
        const { data }: { data: AIImagesResponse } = await axios.post(
          "https://api.openai.com/v1/images/variations",
          formData,
          {
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              ...formData.getHeaders(),
            },
          }
        );

        setState({ images: data.data });
        setIsLoading(false);
      } catch (e) {
        const error = e as any;
        if (error.response) {
          console.error(error.response.data.error);
          setState({ error: new Error(`${error.response.status}: ${error.response.data.error.message}`) });
        } else {
          console.error(error.message);
          setState({ error: error.message });
        }
      }

      return () => {
        cancelRef.current?.abort();
      };
    },
    [state, cancelRef]
  );

  return [state, createImage, createVariation, isLoading] as const;
}
