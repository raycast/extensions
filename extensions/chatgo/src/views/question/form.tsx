import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { uniqBy } from "lodash";
import { QuestionFormProps } from "../../type";
import { useState } from "react";

export const QuestionForm = ({
  initialQuestion,
  onSubmit,
  templateModels,
  selectedTemplateModelId,
  onTemplateModelChange,
  disableChange,
}: QuestionFormProps & { disableChange?: boolean }) => {
  const { pop } = useNavigation();
  const [question, setQuestion] = useState<string>(initialQuestion ?? "");
  const [error, setError] = useState<{ question: string }>({
    question: "",
  });
  const defaultTemplateModel = templateModels.find((x) => x.template_id.toString() === "0");
  const separateDefaultModel = templateModels.filter((x) => x.template_id.toString() !== "0");
  const selectedTemplateModel = templateModels.filter(
    (x) => x.template_id.toString() === selectedTemplateModelId.toString()
  );
  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Submit"
            icon={Icon.Checkmark}
            onAction={() => {
              onSubmit(question);
              pop();
            }}
          ></Action>
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
      ></Form.TextArea>
      <Form.Dropdown
        id="selectedTemplateModelId"
        title="Template"
        storeValue={false}
        placeholder="Choose Template"
        defaultValue={selectedTemplateModelId.toString()}
        onChange={(id) => {
          onTemplateModelChange(Number(id));
        }}
      >
        {disableChange && (
          <>
            {uniqBy(selectedTemplateModel, "template_id").map((model, index) => (
              <Form.Dropdown.Item
                key={model.template_id.toString() + index}
                title={model.template_name}
                value={model.template_id.toString()}
              />
            ))}
          </>
        )}
        {!disableChange && defaultTemplateModel && (
          <Form.Dropdown.Section title="Common Template Models">
            <Form.Dropdown.Item
              key={defaultTemplateModel.template_id.toString() + "-D"}
              title={defaultTemplateModel.template_name}
              value={defaultTemplateModel.template_id.toString()}
            />
          </Form.Dropdown.Section>
        )}
        {!disableChange && (
          <Form.Dropdown.Section title="My Template Models">
            {uniqBy(separateDefaultModel, "template_id").map((model, index) => (
              <Form.Dropdown.Item
                key={model.template_id.toString() + "-F-" + index}
                title={model.template_name}
                value={model.template_id.toString()}
              />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
    </Form>
  );
};
