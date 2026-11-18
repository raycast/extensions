import { List, showToast, Toast, Action, ActionPanel, Form, Icon, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useMemo, useEffect, useCallback } from "react";
import type { CompareFormValues, Message, AIPreferences, ModelStatus } from "../types";
import { askMultipleModels } from "../services/ai";
import { STREAMING_CURSOR } from "../constants";

type ViewState = "form" | "result";

const PROGRESS_ICONS = [
  Icon.CircleProgress25,
  Icon.CircleProgress50,
  Icon.CircleProgress75,
  Icon.CircleProgress100,
] as const;

const STATUS_CONFIG = {
  completed: { icon: Icon.CheckCircle, subtitle: "Completed" },
  error: { icon: Icon.XMarkCircle, subtitle: "Error" },
} as const;

export function AskCompareModelsView() {
  const [viewState, setViewState] = useState<ViewState>("form");
  const [question, setQuestion] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressIconIndex, setProgressIconIndex] = useState(0);

  const preferences = getPreferenceValues<AIPreferences>();
  const availableModels = useMemo(() => {
    if (!preferences.AI_MODEL) {
      return ["openai/gpt-oss-120b"];
    }
    return preferences.AI_MODEL.split(",")
      .map((model) => model.trim())
      .filter(Boolean);
  }, [preferences.AI_MODEL]);

  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      setProgressIconIndex((prev) => (prev + 1) % PROGRESS_ICONS.length);
    }, 300);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleSubmit = useCallback(async (values: CompareFormValues) => {
    const userQuestion = values.question.trim();

    if (!userQuestion) {
      await showFailureToast("Please enter a question");
      return;
    }

    if (!values.models || values.models.length === 0) {
      await showFailureToast("Please select at least one model");
      return;
    }

    setQuestion(userQuestion);
    setSelectedModels(values.models);
    setViewState("result");
    setIsGenerating(true);
    setProgressIconIndex(0);

    const initialStatuses = Object.fromEntries(values.models.map((model) => [model, "generating" as ModelStatus]));
    const initialResponses = Object.fromEntries(values.models.map((model) => [model, ""]));

    setResponses(initialResponses);
    setModelStatuses(initialStatuses);

    await generateComparison(userQuestion, values.models);
  }, []);

  async function generateComparison(userQuestion: string, models: string[]) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating responses...",
    });

    try {
      const messages: Message[] = [{ role: "user", content: userQuestion }];

      const results = await askMultipleModels(messages, models, (model, text) => {
        setResponses((prev) => ({ ...prev, [model]: text }));
      });

      const { statuses, responses, errors } = results.reduce(
        (acc, result) => {
          acc.statuses[result.model] = result.status;
          acc.responses[result.model] = result.status === "error" ? "" : result.response;
          if (result.status === "error") {
            acc.errors.push(result.model);
          }
          return acc;
        },
        {
          statuses: {} as Record<string, ModelStatus>,
          responses: {} as Record<string, string>,
          errors: [] as string[],
        },
      );

      setModelStatuses(statuses);
      setResponses(responses);
      setIsGenerating(false);

      if (errors.length > 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Partially completed";
        toast.message = `Failed: ${errors.join(", ")}. Please check the model name is correct, or try again later if requests are too frequent.`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "All responses completed successfully";
      }
    } catch (error) {
      console.error("Error:", error);
      setIsGenerating(false);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to generate comparison";
      toast.message = "Please verify the model name is correct or try again later if requests are too frequent.";
      setViewState("form");
    }
  }

  const handleReset = useCallback(() => {
    setViewState("form");
    setQuestion("");
    setSelectedModels([]);
    setResponses({});
    setModelStatuses({});
    setIsGenerating(false);
    setProgressIconIndex(0);
  }, []);

  const getModelIcon = useCallback(
    (status: ModelStatus) => {
      if (status === "generating") return PROGRESS_ICONS[progressIconIndex];
      return STATUS_CONFIG[status].icon;
    },
    [progressIconIndex],
  );

  const getModelSubtitle = useCallback((status: ModelStatus) => {
    if (status === "generating") return "Generating...";
    return STATUS_CONFIG[status].subtitle;
  }, []);

  const getModelMarkdown = useCallback((model: string, status: ModelStatus, response: string) => {
    if (status === "error") {
      return `# ${model}\n\n⚠️ **Failed to generate response for this model.**\n\nPlease check:\n- Model name is correct\n- API key is valid\n- Try again if requests are too frequent`;
    }

    const cursor =
      status === "generating" && !response ? "Waiting..." : status === "generating" ? STREAMING_CURSOR : "";
    return `# ${model}\n\n${response || ""}${cursor}`;
  }, []);

  if (viewState === "form") {
    return (
      <Form
        navigationTitle="Compare Models"
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Compare" icon={Icon.Stars} onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextArea id="question" title="Question" placeholder="Enter your question here..." autoFocus />
        <Form.TagPicker id="models" title="Select Models" placeholder="Select models to compare" storeValue>
          {availableModels.map((model) => (
            <Form.TagPicker.Item key={model} value={model} title={model} />
          ))}
        </Form.TagPicker>
        <Form.Description text="Select one or more models to compare their responses" />
        <Form.Description text="Get the available models at: https://vercel.com/ai-gateway/models and add them to your preferences." />
      </Form>
    );
  }

  return (
    <List
      isLoading={isGenerating}
      isShowingDetail
      navigationTitle={`Model Comparison - ${question}`}
      searchBarPlaceholder="Search models..."
    >
      {selectedModels.map((model) => {
        const response = responses[model] || "";
        const status = modelStatuses[model] || "generating";

        return (
          <List.Item
            key={model}
            icon={getModelIcon(status)}
            title={model}
            subtitle={getModelSubtitle(status)}
            detail={<List.Item.Detail markdown={getModelMarkdown(model, status, response)} />}
            actions={
              <ActionPanel>
                <Action title="New Comparison" icon={Icon.Plus} onAction={handleReset} />
                <Action.CopyToClipboard
                  title="Copy Response"
                  content={response}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy All Responses"
                  content={selectedModels.map((m) => `${m}:\n${responses[m]}\n`).join("\n")}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
