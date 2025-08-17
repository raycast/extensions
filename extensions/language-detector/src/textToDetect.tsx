import { useEffect, useState } from "react";
import { AI, Action, ActionPanel, Clipboard, environment, Form, Icon, LaunchProps, Toast } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { callbackLaunchCommand, LaunchOptions } from "raycast-cross-extension";
import { Detector } from "raycast-language-detector";
import { detectLanguage, emptyResult, getValidAiModels, supportedDetectors, useDetector, useModel } from "./utils.js";
import { Model } from "./types.js";

type LaunchContext = {
  content?: string;
  callbackLaunchOptions?: LaunchOptions;
};

export default function TextToDetect({ launchContext = {} }: LaunchProps<{ launchContext?: LaunchContext }>) {
  const { content, callbackLaunchOptions } = launchContext;
  const [languageName, setLanguageName] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [supportedModels, setSupportedModels] = useCachedState<Model[]>("supported-models", []);
  const [selectedDetector, setSelectedDetector] = useDetector();
  const [selectedModel, setSelectedModel] = useModel();
  const canAccessAi = environment.canAccess(AI);

  useEffect(() => {
    if (content && callbackLaunchOptions) {
      detectLanguage(content, selectedDetector, selectedModel)
        .catch(() => emptyResult)
        .then((result) => {
          callbackLaunchCommand(callbackLaunchOptions, result);
        });
    }
  }, []);

  const { handleSubmit, itemProps } = useForm<{ content: string; detector: string; model: string }>({
    initialValues: {
      content: content ?? "",
    },
    onSubmit: async (values) => {
      if (isDetecting) return;
      const toast = new Toast({ style: Toast.Style.Animated, title: "Detecting language..." });
      toast.show();
      try {
        setLanguageName("");
        setIsDetecting(true);
        const { languageName } = await detectLanguage(values.content, selectedDetector, selectedModel);
        setLanguageName(languageName);
        toast.hide();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to detect language";
        toast.message = error instanceof Error ? error.message : "An error occurred while detecting language.";
        toast.primaryAction =
          error instanceof Error
            ? {
                title: "Copy to Clipboard",
                onAction: () => {
                  Clipboard.copy(error.message);
                },
              }
            : undefined;
      } finally {
        setIsDetecting(false);
      }
    },
    validation: {
      content: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (canAccessAi && selectedDetector === Detector.AI) {
      getValidAiModels()
        .then(setSupportedModels)
        .catch(() => []);
    } else {
      setSupportedModels([]);
    }
  }, [selectedDetector]);

  return (
    <Form
      actions={
        <ActionPanel>
          {!canAccessAi && selectedDetector === Detector.AI ? (
            <Action.OpenInBrowser icon={Icon.StarCircle} title="Try Raycast Pro" url="https://raycast.com/pro" />
          ) : (
            <Action.SubmitForm icon={Icon.Stars} title="Detect Language" onSubmit={handleSubmit} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Text to Detect"
        {...itemProps.content}
        onChange={(value) => {
          setLanguageName("");
          itemProps.content?.onChange?.(value);
        }}
      />
      <Form.Dropdown
        title="Detector"
        info={selectedDetector === "ai" && !canAccessAi ? "This feature requires Raycast Pro subscription." : undefined}
        {...itemProps.detector}
        value={undefined}
        defaultValue={selectedDetector}
        onChange={(value) => {
          itemProps.detector.onChange?.(value);
          setSelectedDetector(value as Detector);
        }}
      >
        {supportedDetectors
          .sort((a, b) => {
            if (a === "ai" && !canAccessAi) return 1;
            if (b === "ai" && !canAccessAi) return -1;
            return supportedDetectors.indexOf(a) - supportedDetectors.indexOf(b);
          })
          .map((detector) => (
            <Form.Dropdown.Item
              key={detector}
              value={detector}
              icon={
                detector === "ai"
                  ? { source: "raycast.svg", tintColor: "#FF6363" }
                  : { source: "npm.svg", tintColor: "#CB3837" }
              }
              title={detector === "ai" ? `Raycast AI` + (canAccessAi ? "" : " (Unavailable)") : detector}
            />
          ))}
      </Form.Dropdown>
      {supportedModels.length > 0 && (
        <Form.Dropdown
          title="AI Model"
          {...itemProps.model}
          value={undefined}
          defaultValue={selectedModel}
          onChange={(value) => {
            setSelectedModel(value);
          }}
        >
          <Form.Dropdown.Item key="default" value="" title="Default" />
          {supportedModels.map((model) => (
            <Form.Dropdown.Item key={model.id} value={model.id} title={model.name} />
          ))}
        </Form.Dropdown>
      )}
      {languageName && <Form.Description title="Language" text={languageName} />}
    </Form>
  );
}
