import { model, default_model_token_offset, default_model } from "../../assets/model.json";
// import { Model } from "../type";
// import { modelList } from "../ModelData";
import { Model } from "../types";
import { ModelHook } from "../types";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

export const DEFAULT_MODEL_NAME = default_model;
export const DEFAULT_MODEL_TOKENS_OFFSET = default_model_token_offset;
export const modelList = model as Model[];

export const useModel = (selectedModel?: string): ModelHook => {
  const [data, setData] = useState<Model[]>(modelList);
  const [selectedModelName, setSelectedModelName] = useState<string>(selectedModel || DEFAULT_MODEL_NAME);
  const [maxModelTokens, setMaxModelTokens] = useState<number>(0);
  const [maxTokenOffset] = useState<number>(DEFAULT_MODEL_TOKENS_OFFSET);

  useEffect(() => {
    const select = data.find((model) => selectedModelName === model.name);
    if (select) {
      setMaxModelTokens(select.max_tokens);
    }
  }, [selectedModelName]);

  useEffect(() => {
    console.log("selectedModelName", selectedModelName, selectedModel);
  }, [selectedModelName]);

  return useMemo(
    () => ({ data, selectedModelName, setSelectedModelName, maxModelTokens, maxTokenOffset }),
    [data, selectedModelName, setSelectedModelName, maxModelTokens, maxTokenOffset]
  );
};
