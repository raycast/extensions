import { useEffect, useState } from "react";
import { Model } from "../lib/models/types";
import { Color, Icon, LocalStorage } from "@raycast/api";
import { installDefaults } from "../lib/files/file-utils";
import { updateModel } from "../lib/models";

export function useModels() {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>();

  const loadModels = async () => {
    // Get the model settings
    setIsLoading(true);
    const items = await LocalStorage.allItems();
    const modelObjs = Object.entries(items)
      .filter(([key]) => key.startsWith("--model-"))
      .map(([, value]) => JSON.parse(value));
    setModels(modelObjs);
    setIsLoading(false);
  };

  useEffect(() => {
    Promise.resolve(installDefaults()).then(() => {
      Promise.resolve(loadModels());
    });
  }, []);

  const revalidate = async () => {
    return loadModels();
  };

  const dummyModel = (): Model => {
    return {
      name: "",
      description: "",
      icon: Icon.Gear,
      iconColor: Color.Red,
      favorited: false,
      endpoint: "",
      authType: "",
      apiKey: "",
      inputSchema: "",
      outputKeyPath: "",
      outputTiming: "sync",
      lengthLimit: "2500",
      id: "",
      notes: "",
      isDefault: false,
      temperature: "1.0",
    };
  };

  const createModel = async (newData: Model & { [key: string]: string | boolean }) => {
    // Check if the name is empty
    if (!newData.name) {
      setError("Name cannot be empty.");
      return false;
    }

    // Check if a model with that name already exists
    if (models.find((model) => model.name == newData.name)) {
      setError("A model with that name already exists.");
      return false;
    }

    // Create the model object
    const newModel: Model = {
      name: newData.name,
      description: newData.description || "",
      icon: newData.icon || Icon.Gear,
      iconColor: newData.iconColor || Color.PrimaryText,
      favorited: false,
      endpoint: newData.endpoint || "",
      authType: newData.authType || "",
      apiKey: newData.apiKey || "",
      inputSchema: newData.inputSchema || "",
      outputKeyPath: newData.outputKeyPath || "",
      outputTiming: newData.outputTiming || "sync",
      lengthLimit: newData.lengthLimit || "2500",
      id: "",
      notes: newData.notes || "",
      isDefault: newData.isDefault,
      temperature: newData.temperature || "1.0",
    };

    // If this is the default model, set all other models to not be default
    if (newData.isDefault) {
      for (const model of models) {
        await updateModel(model, { ...model, isDefault: false });
      }
    }

    // Save the model
    await LocalStorage.setItem(`--model-${newData.name}`, JSON.stringify(newModel));
    return newModel;
  };

  const favorites = () => {
    return models.filter((model) => model.favorited);
  };

  return {
    models: models,
    isLoading: isLoading,
    error: error,
    revalidate: revalidate,
    createModel: createModel,
    favorites: favorites,
    dummyModel: dummyModel,
  };
}
