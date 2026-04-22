import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Model, ModelHook, ReasoningEffort } from "../type";
import { orderModelOptionsForSelection, CHATGPT_CODEX_SUPPORTED_MODELS } from "../utils/model-support";

type StoredModel = Partial<Model> & Pick<Model, "id">;

export const DEFAULT_MODEL: Model = {
  id: "default",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: "Default",
  prompt: "You are a helpful assistant.",
  option: "gpt-5.4-mini",
  temperature: "1",
  enableReasoningEffortChange: false,
  reasoningEffort: "medium",
  pinned: false,
  vision: false,
};

const REASONING_EFFORT_OPTIONS: ReasoningEffort[] = ["none", "low", "medium", "high"];

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return typeof value === "string" && REASONING_EFFORT_OPTIONS.includes(value as ReasoningEffort);
}

function normalizeModel(model: StoredModel): Model {
  const now = new Date().toISOString();
  return {
    ...DEFAULT_MODEL,
    ...model,
    id: model.id,
    created_at: model.created_at ?? now,
    updated_at: model.updated_at ?? now,
    temperature: String(model.temperature ?? DEFAULT_MODEL.temperature),
    enableReasoningEffortChange: Boolean(model.enableReasoningEffortChange),
    reasoningEffort: isReasoningEffort(model.reasoningEffort) ? model.reasoningEffort : DEFAULT_MODEL.reasoningEffort,
    vision: model.vision ?? false,
    pinned: model.pinned ?? false,
  };
}

function normalizeModels(models: Record<string, StoredModel>): Record<string, Model> {
  const normalized = Object.values(models).reduce<Record<string, Model>>((acc, model) => {
    acc[model.id] = normalizeModel(model);
    return acc;
  }, {});
  if (!normalized[DEFAULT_MODEL.id]) {
    normalized[DEFAULT_MODEL.id] = DEFAULT_MODEL;
  }
  return normalized;
}

export function useModel(): ModelHook {
  const [data, setData] = useState<Record<string, Model>>({});
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isFetching] = useState<boolean>(false);
  const [option] = useState<Model["option"][]>(orderModelOptionsForSelection([...CHATGPT_CODEX_SUPPORTED_MODELS]));
  const isInitialMount = useRef(true);

  useEffect(() => {
    (async () => {
      const storedModels: StoredModel[] | Record<string, StoredModel> = JSON.parse(
        (await LocalStorage.getItem<string>("models")) || "{}",
      );
      const storedModelsLength = ((models: Record<string, StoredModel> | StoredModel[]): number =>
        Array.isArray(models) ? models.length : Object.keys(models).length)(storedModels);

      if (storedModelsLength === 0) {
        setData({ [DEFAULT_MODEL.id]: DEFAULT_MODEL });
      } else {
        let modelsById: Record<string, StoredModel>;
        // Support for old data structure
        if (Array.isArray(storedModels)) {
          modelsById = storedModels.reduce((acc, model) => ({ ...acc, [model.id]: model }), {});
        } else {
          modelsById = storedModels;
        }
        if (!modelsById[DEFAULT_MODEL.id]) {
          modelsById[DEFAULT_MODEL.id] = DEFAULT_MODEL;
        } else if (!CHATGPT_CODEX_SUPPORTED_MODELS.includes(modelsById[DEFAULT_MODEL.id].option?.trim() as never)) {
          modelsById[DEFAULT_MODEL.id] = {
            ...modelsById[DEFAULT_MODEL.id],
            option: DEFAULT_MODEL.option,
            updated_at: new Date().toISOString(),
          };
        }
        setData(normalizeModels(modelsById));
      }
      setLoading(false);
      isInitialMount.current = false;
    })();
  }, []);

  useEffect(() => {
    // Avoid saving when initial loading
    if (isInitialMount.current) {
      return;
    }
    LocalStorage.setItem("models", JSON.stringify(data));
  }, [data]);

  const add = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Saving your model...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => ({
        ...prevData,
        [model.id]: normalizeModel({ ...model, created_at: new Date().toISOString() }),
      }));
      toast.title = "Model saved!";
      toast.style = Toast.Style.Success;
    },
    [setData],
  );

  const update = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Updating your model...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => ({
        ...prevData,
        [model.id]: normalizeModel({
          ...prevData[model.id],
          ...model,
          updated_at: new Date().toISOString(),
        }),
      }));
      toast.title = "Model updated!";
      toast.style = Toast.Style.Success;
    },
    [setData],
  );

  const remove = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Removing your model...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => {
        const newData = { ...prevData };
        delete newData[model.id];
        return newData;
      });
      toast.title = "Model removed!";
      toast.style = Toast.Style.Success;
    },
    [setData],
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing your models ...",
      style: Toast.Style.Animated,
    });
    setData({ [DEFAULT_MODEL.id]: DEFAULT_MODEL });
    toast.title = "Models cleared!";
    toast.style = Toast.Style.Success;
  }, [setData]);

  const setModels = useCallback(
    async (models: Record<string, Model>) => {
      setData(normalizeModels(models));
    },
    [setData],
  );

  return useMemo(
    () => ({ data, isLoading, option, add, update, remove, clear, setModels, isFetching }),
    [data, isLoading, option, add, update, remove, clear, setModels, isFetching],
  );
}
