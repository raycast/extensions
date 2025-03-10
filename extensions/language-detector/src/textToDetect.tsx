import { useEffect, useState } from "react";
import { AI, Action, ActionPanel, Clipboard, environment, Form, Icon, LaunchProps, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { callbackLaunchCommand, LaunchOptions } from "raycast-cross-extension";
import { Detector } from "raycast-language-detector";
import { detectLanguage, detector, emptyResult, supportedDetectors } from "./utils.js";

type LaunchContext = {
  content?: string;
  callbackLaunchOptions?: LaunchOptions;
};

export default function TextToDetect({ launchContext = {} }: LaunchProps<{ launchContext?: LaunchContext }>) {
  const { content, callbackLaunchOptions } = launchContext;
  const [languageName, setLanguageName] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const canAccessAi = environment.canAccess(AI);

  useEffect(() => {
    if (content && callbackLaunchOptions) {
      detectLanguage(content)
        .catch(() => emptyResult)
        .then((result) => {
          callbackLaunchCommand(callbackLaunchOptions, result);
        });
    }
  }, []);

  const { handleSubmit, itemProps } = useForm<{ content: string; detector: string }>({
    initialValues: {
      content: content ?? "",
      detector: detector === "ai" && !canAccessAi ? "languagedetect" : detector,
    },
    onSubmit: async (values) => {
      if (isDetecting) return;
      const toast = new Toast({ style: Toast.Style.Animated, title: "Detecting language..." });
      toast.show();
      try {
        setLanguageName("");
        setIsDetecting(true);
        const { languageName } = await detectLanguage(values.content, values.detector as Detector);
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

  return (
    <Form
      actions={
        <ActionPanel>
          {!canAccessAi && itemProps.detector.value === Detector.AI ? (
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
        info={
          itemProps.detector.value === "ai" && !canAccessAi
            ? "This feature requires Raycast Pro subscription."
            : undefined
        }
        {...itemProps.detector}
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
      {languageName && <Form.Description title="Language" text={languageName} />}
    </Form>
  );
}
