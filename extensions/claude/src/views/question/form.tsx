import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { DEFAULT_MODEL } from "../../hooks/useModel";
import type { QuestionFormProps } from "../../type";
import { orderForMount, RAW_MODEL_PREFIX, shortModelName } from "../../utils/models";

export const QuestionForm = ({
  initialQuestion,
  selectedModel,
  models,
  availableModels = [],
  onModelChange,
  onSubmit,
}: QuestionFormProps) => {
  const { pop } = useNavigation();

  const [question, setQuestion] = useState<string>(initialQuestion ?? "");
  const [error, setError] = useState<{ question: string }>({
    question: "",
  });

  /**
   * The form's OWN copy of the selection, and the value it submits with.
   *
   * `Form.Dropdown` was previously uncontrolled (`defaultValue={selectedModel}`), so the
   * only record of a change made inside this form was the parent state that
   * `onModelChange` updated — which the pushed element's `onSubmit` closure could not
   * see. Holding the selection here makes this component the single source of truth for
   * what it displays AND what it submits, which is the same rule THE DROPDOWN RULE states
   * for `List.Dropdown` in `src/views/model/dropdown.tsx`, applied to `Form.Dropdown`.
   *
   * The parent is still notified via `onModelChange` (it persists the choice and drives
   * the list view behind this form), but the parent is no longer on the path between
   * picking a model and sending it.
   */
  const [modelId, setModelId] = useState<string>(selectedModel);

  // Same mount protection as the list dropdown (`orderForMount`). The first-item-at-mount
  // onChange was observed on `List.Dropdown`; `Form.Dropdown` is assumed to behave the same,
  // and here that value would be both submitted and persisted through `onModelChange`. Ordered by the selection the form opened with — which
  // `useState` above holds stable — and never re-sorted after. The built-in default is shown
  // even when the presets list lacks it, as before.
  const [startModelId] = useState<string>(selectedModel);
  const { presets, rawModels, modelsFirst } = orderForMount(
    models.some((x) => x.id === "default") ? models : [DEFAULT_MODEL, ...models],
    availableModels,
    startModelId,
  );

  const presetSection = (
    <Form.Dropdown.Section key="presets" title="Presets">
      {presets.map((model) => (
        <Form.Dropdown.Item key={model.id} value={model.id} title={shortModelName(model.name)} />
      ))}
    </Form.Dropdown.Section>
  );
  const modelSection = rawModels.length > 0 && (
    <Form.Dropdown.Section key="models" title="Models">
      {rawModels.map((model) => (
        <Form.Dropdown.Item
          key={`${RAW_MODEL_PREFIX}${model.id}`}
          value={`${RAW_MODEL_PREFIX}${model.id}`}
          title={shortModelName(model.display_name)}
        />
      ))}
    </Form.Dropdown.Section>
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Submit"
            icon={Icon.Checkmark}
            onAction={() => {
              // Submits the model the dropdown is CURRENTLY showing — see THE SUBMIT
              // RULE on `QuestionFormProps.onSubmit`.
              onSubmit(question, modelId);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="Type your question here"
        error={error.question.length > 0 ? error.question : undefined}
        onChange={setQuestion}
        value={question}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setError({ ...error, question: "Required" });
          } else {
            if (error.question && error.question.length > 0) {
              setError({ ...error, question: "" });
            }
          }
        }}
      />
      <Form.Dropdown
        id="model"
        title="Model"
        placeholder="Choose model"
        value={modelId}
        onChange={(id) => {
          // Local state first — it is what `onSubmit` reads. The parent notification is
          // for persistence and for the view behind this form; it is not on the path
          // between this dropdown and the request.
          setModelId(id);
          onModelChange(id);
        }}
      >
        {modelsFirst ? [modelSection, presetSection] : [presetSection, modelSection]}
      </Form.Dropdown>
    </Form>
  );
};
