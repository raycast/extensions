import { Action, ActionPanel, Form, getPreferenceValues, getSelectedText } from "@raycast/api";
import { allModels as changeModels } from "./hook/utils";
import { useEffect, useState } from "react";
import ResultView from "./hook/accessAPI";

const prefs = getPreferenceValues();
const usedModel = prefs.model_coding;
const sys_prompt = prefs.coding_sys_prompt;
const default_question = prefs.coding_default_question;
const toast_title = "Coding...";

export default function AskView(props: { arguments: { query?: string }; fallbackText?: string }) {
  let { query } = props.arguments;
  if (!query) query = props.fallbackText ?? "";
  const [question, setQuestion] = useState(query ?? "");
  const [questionError, setQuestionError] = useState<string | undefined>();
  const [selectedText, setSelectedText] = useState<string | undefined>();
  const [canUseContext, setCanUseContext] = useState<boolean | undefined>();
  const [usingContext, setUsingContext] = useState<boolean>(false);
  const [model_override, setUsedModel] = useState<string>(usedModel);

  function dropQuestionErrorIfNeeded() {
    if (questionError?.length ?? 0 > 0) {
      setQuestionError(undefined);
    }
  }

  function setQuestionErrorIfNeeded() {
    if (question.length === 0 && !usingContext) {
      setQuestionError("Question is empty!");
    }
  }
  useEffect(() => {
    (async () => {
      try {
        let selectedText: string | undefined = await getSelectedText();
        if (selectedText.length === 0) {
          // Sometimes the call will return successfully but the text is "". In
          // this case we'll just let ResultView retry getting the selected
          // text later.
          selectedText = undefined;
        }
        setSelectedText(selectedText);
        setCanUseContext(true);
        setUsingContext(true);
      } catch (error) {
        // No selected text. Pass an empty string so ResultView won't try getting selected text
        setCanUseContext(false);
      }
    })();
  }, []);

  useEffect(() => {
    setQuestionErrorIfNeeded();
  }, [usingContext]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Push
            title="Submit"
            target={
              <ResultView
                sys_prompt={sys_prompt}
                selected_text={usingContext ? selectedText : ""}
                user_extra_msg={question ? question : default_question}
                model_override={model_override}
                toast_title={toast_title}
                temperature={0.4}
              />
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        enableMarkdown
        placeholder={
          (usingContext && default_question + " ") || // Raycast will append ellipsis
          undefined
        }
        value={question}
        error={questionError}
        onChange={(newValue) => {
          setQuestion(newValue);
          dropQuestionErrorIfNeeded();
        }}
        onBlur={setQuestionErrorIfNeeded}
      />
      {canUseContext === true ? (
        <Form.Checkbox
          id="use_selected_text"
          title="Context"
          label="Use selected text"
          value={usingContext}
          onChange={setUsingContext}
        />
      ) : (
        <Form.Description
          title="Context"
          text={
            // Undefined when we're still trying to get the selection
            canUseContext === false ? "No selected text" : "Getting selected text..."
          }
        />
      )}
      <Form.Dropdown id="selectedModel" title="Selected Model" defaultValue={model_override} onChange={setUsedModel}>
        {changeModels.map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
