import {
  Action,
  ActionPanel,
  AI,
  environment,
  Form,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ApiSettingsHook } from "../hooks/useApiSettings";
import { ApiCompatible, compatibilityProfiles, getCompatibilityProfile } from "../runtime/api-compatibility";
import { sanitizeApiSettings } from "../runtime/api-settings";
import { validateApiConnection } from "../runtime/api-validation";
import { listModels, ModelOption } from "../runtime/model-list";
import { isModelCacheFresh, readModelListCache, writeModelListCache } from "../hooks/model-cache";

export interface ApiSettingsFormProps {
  hook: ApiSettingsHook;
}

export function ApiSettingsForm({ hook }: ApiSettingsFormProps) {
  const { pop } = useNavigation();
  const [isValidating, setIsValidating] = useState(false);
  const [apiCompatible, setApiCompatible] = useState<ApiCompatible>(hook.data.apiCompatible);
  const [apiBase, setApiBase] = useState(
    hook.data.apiBase || getCompatibilityProfile(hook.data.apiCompatible).defaultApiBase,
  );
  const [apiKey, setApiKey] = useState(hook.data.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsUpdatedAt, setModelsUpdatedAt] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [hasAutoLoadedModels, setHasAutoLoadedModels] = useState(false);
  const [validationModel, setValidationModel] = useState(hook.data.validatedModel ?? "");
  const [customValidationModel, setCustomValidationModel] = useState("");
  const selectedProfile = getCompatibilityProfile(apiCompatible);
  const isRaycastAI = apiCompatible === "raycast";
  const hasSelectedModelInList = models.some((model) => model.id === validationModel);

  function handleCompatibleChange(value: string) {
    const nextCompatible = value as ApiCompatible;
    const currentDefault = selectedProfile.defaultApiBase;
    const nextDefault = getCompatibilityProfile(nextCompatible).defaultApiBase;
    setApiCompatible(nextCompatible);
    setModels([]);
    setModelsUpdatedAt("");
    setValidationModel("");
    setCustomValidationModel("");
    setHasAutoLoadedModels(false);
    if (nextCompatible === "raycast") {
      setApiBase("");
      return;
    }
    if (!apiBase || apiBase === currentDefault) {
      setApiBase(nextDefault);
    }
  }

  const loadModelList = useCallback(
    async (showFeedback = true) => {
      const settings = sanitizeApiSettings({
        apiBase,
        apiKey,
        apiCompatible,
      });
      const toast = showFeedback
        ? await showToast({
            title: "Loading model list...",
            message: isRaycastAI ? "Raycast AI" : selectedProfile.modelsPath,
            style: Toast.Style.Animated,
          })
        : undefined;
      setIsLoadingModels(true);
      try {
        const loadedModels = await listModels(settings, fetch, AI.Model as Record<string, string>);
        const cacheEntry = await writeModelListCache(settings, loadedModels);
        setModels(loadedModels);
        setModelsUpdatedAt(cacheEntry.updatedAt);
        const customModel = customValidationModel.trim();
        if (customModel && loadedModels.some((model) => model.id === customModel)) {
          setValidationModel(customModel);
          setCustomValidationModel("");
        } else if (!validationModel && loadedModels[0]) {
          setValidationModel(loadedModels[0].id);
        }
        if (toast) {
          toast.title = loadedModels.length ? "Model list loaded" : "Model list is empty";
          toast.message = loadedModels.length
            ? `${loadedModels.length} models available`
            : "Use a custom validation model.";
          toast.style = loadedModels.length ? Toast.Style.Success : Toast.Style.Failure;
        }
      } catch (error) {
        if (toast) {
          toast.title = "Model list unavailable";
          toast.message = error instanceof Error ? error.message : String(error);
          toast.style = Toast.Style.Failure;
        }
      } finally {
        setIsLoadingModels(false);
      }
    },
    [apiBase, apiCompatible, apiKey, customValidationModel, isRaycastAI, selectedProfile.modelsPath, validationModel],
  );

  useEffect(() => {
    if (hasAutoLoadedModels || (!apiBase && !isRaycastAI)) {
      return;
    }
    setHasAutoLoadedModels(true);
    (async () => {
      const settings = sanitizeApiSettings({
        apiBase,
        apiKey,
        apiCompatible,
      });
      const cached = await readModelListCache(settings);
      if (cached) {
        setModels(cached.models);
        setModelsUpdatedAt(cached.updatedAt);
        if (!validationModel && cached.models[0]) {
          setValidationModel(cached.models[0].id);
        }
      }
      if (!isModelCacheFresh(cached)) {
        loadModelList(false);
      }
    })();
  }, [apiBase, hasAutoLoadedModels, isRaycastAI, loadModelList]);

  async function submit() {
    const model = customValidationModel.trim() || validationModel.trim() || undefined;
    const settings = sanitizeApiSettings({
      apiBase,
      apiKey,
      apiCompatible,
      validatedModel: model,
    });
    const toast = await showToast({
      title: "Validating API settings...",
      message: "Checking model list",
      style: Toast.Style.Animated,
    });
    setIsValidating(true);
    try {
      const result = await validateApiConnection(
        settings,
        fetch,
        (message) => {
          toast.message = message;
        },
        isRaycastAI
          ? {
              canAccess: () => environment.canAccess(AI),
              models: AI.Model as Record<string, string>,
            }
          : undefined,
      );
      toast.message = `Validated with ${result.model.id}`;
      await hook.save({
        ...settings,
        validatedAt: new Date().toISOString(),
        validatedModel: result.model.id,
      });
      toast.title = "API settings saved";
      toast.style = Toast.Style.Success;
      pop();
    } catch (error) {
      toast.title = "API validation failed";
      toast.message = error instanceof Error ? error.message : String(error);
      toast.style = Toast.Style.Failure;
    } finally {
      setIsValidating(false);
    }
  }

  const modelListStatus = modelsUpdatedAt
    ? `${models.length} cached models. Last refreshed ${modelsUpdatedAt}. Press Cmd-R or use Actions > Refresh Model List to reload.`
    : `No cached models for ${isRaycastAI ? "Raycast AI" : "this API Base"}. Press Cmd-R or use Actions > Refresh Model List to load models.`;

  return (
    <Form
      isLoading={isValidating || isLoadingModels}
      navigationTitle="API Settings"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Validate and Save" icon={Icon.Checkmark} onSubmit={submit} />
          <Action
            title="Refresh Model List"
            icon={Icon.ArrowClockwise}
            onAction={() => loadModelList(true)}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="apiCompatible" title="AI Runtime" value={apiCompatible} onChange={handleCompatibleChange}>
        {compatibilityProfiles.map((profile) => (
          <Form.Dropdown.Item key={profile.id} value={profile.id} title={profile.title} />
        ))}
      </Form.Dropdown>
      {isRaycastAI ? (
        <Form.Description
          title="Raycast AI"
          text="Uses Raycast's built-in AI API. No API base or API key is required."
        />
      ) : (
        <>
          <Form.TextField
            id="apiBase"
            title="API Base"
            value={apiBase}
            onChange={setApiBase}
            placeholder={selectedProfile.defaultApiBase}
          />
          {showApiKey ? (
            <Form.TextField id="apiKey" title="API Key" value={apiKey} onChange={setApiKey} />
          ) : (
            <Form.PasswordField id="apiKey" title="API Key" value={apiKey} onChange={setApiKey} />
          )}
          <Form.Checkbox
            id="showApiKey"
            title="Security"
            label="Show API key"
            value={showApiKey}
            onChange={setShowApiKey}
          />
        </>
      )}
      <Form.Dropdown
        id="validationModel"
        title="Validation Model"
        value={validationModel}
        onChange={setValidationModel}
      >
        <Form.Dropdown.Item
          value=""
          title={
            isRaycastAI
              ? "Use Raycast AI default"
              : models.length
                ? "Use first listed model"
                : "No model list data; use custom model"
          }
        />
        {validationModel && !hasSelectedModelInList && (
          <Form.Dropdown.Item value={validationModel} title={`${validationModel} (current)`} />
        )}
        {models.map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.name} />
        ))}
      </Form.Dropdown>
      <Form.Description title="Models" text={modelListStatus} />
      {!isRaycastAI && (
        <Form.TextField
          id="customValidationModel"
          title="Custom Validation Model"
          value={customValidationModel}
          onChange={setCustomValidationModel}
          placeholder="Overrides the selected model when filled"
        />
      )}
      <Form.Description
        title="Validation"
        text={
          isRaycastAI
            ? "Kraft will check whether Raycast AI is available and save the selected default model."
            : "Kraft will use the custom model, selected model, or first listed model, then send a hi chat request before saving."
        }
      />
      {hook.data.validatedAt && (
        <Form.Description
          title="Last Validated"
          text={`${hook.data.validatedAt}${hook.data.validatedModel ? ` with ${hook.data.validatedModel}` : ""}`}
        />
      )}
    </Form>
  );
}
