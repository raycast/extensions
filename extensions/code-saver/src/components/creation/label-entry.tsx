import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { upsertLabel, useDataFetch } from "../../lib/hooks/use-data-ops";
import { Label } from "../../lib/types/dto";
import InitError from "../init/init-error";
import { useState } from "react";
import { labelIcon } from "../../lib/utils/snippet-utils";

export interface LabelValues {
  uuid?: string;
  colorHex?: string;
  title: string;
}

export default function UpsertLabelEntry({
  uuid,
  title,
  colorHex,
  onSuccess,
}: {
  uuid?: string;
  title?: string;
  colorHex?: string;
  onSuccess: () => void;
}) {
  const { isLoading, data: allLabels, error: loadLabelErr } = useDataFetch<Label>("label");
  const [titleError, setTitleError] = useState<string | undefined>();
  const [colorHexError, setColorHexError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [previewColorHex, setPreviewColorHex] = useState<string | undefined>();
  const [previewTitle, setPreviewTitle] = useState<string | undefined>();

  const { push, pop } = useNavigation();

  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }
  function dropColorHexErrorIfNeeded() {
    if (colorHexError && colorHexError.length > 0) {
      setColorHexError(undefined);
    }
  }

  async function handleSubmit(values: LabelValues) {
    if (values.title.length === 0) {
      setTitleError("Label title is required");
      return;
    }
    setIsSubmitting(true);
    const response = await upsertLabel({
      title: values.title,
      colorHex: values.colorHex?.length == 0 ? undefined : values.colorHex,
      uuid,
    });

    if (response === undefined) {
      showToast({
        style: Toast.Style.Success,
        title: "Label saved",
        message: `"${values.title}" was saved.`,
      });
      onSuccess();
      pop();
    } else {
      push(<InitError errMarkdown={response} />);
    }

    setIsSubmitting(false);
  }

  const errMsg = loadLabelErr
    ? `# Something wrong
Some errors happened when fetching libraries from database. 
Error details are as follows:
\`\`\`
${loadLabelErr instanceof Error ? loadLabelErr.stack : String(loadLabelErr)}
\`\`\`
`
    : undefined;

  return errMsg ? (
    <InitError errMarkdown={errMsg} />
  ) : (
    <Form
      enableDrafts
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Label" />
        </ActionPanel>
      }
      navigationTitle={uuid ? "Update Label" : "Create New Label"}
    >
      <Form.Description
        text="Give title and color hex for this label.
Leaving color hex blank will generate random one color."
      />
      <Form.TextField
        id="title"
        title="Label Title"
        placeholder="Tag can be used to classify the snippets"
        error={titleError}
        onChange={dropTitleErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length === 0) {
            setTitleError("Label title is required");
          } else if (
            allLabels !== undefined &&
            allLabels.filter((label) => label.title == event.target.value && label.uuid !== uuid).length > 0
          ) {
            setTitleError("Label title is duplicated");
          } else {
            setPreviewTitle(event.target.value);
            dropTitleErrorIfNeeded();
          }
        }}
        defaultValue={title ?? ""}
      />
      <Form.TextField
        id="colorHex"
        title="Color Hex Representation"
        placeholder="For example, #FAFBFC"
        info="Leave it blank to generate random one"
        error={colorHexError}
        onChange={(newValue) => {
          if (!newValue.match(/^#[0-9a-f]{3,6}$/i)) {
            setColorHexError("Color format error");
          } else {
            dropColorHexErrorIfNeeded();
            setPreviewColorHex(newValue);
          }
        }}
        onBlur={(event) => {
          if (!event.target.value?.match(/^#[0-9a-f]{3,6}$/i)) {
            setColorHexError("Color format error");
          } else {
            dropColorHexErrorIfNeeded();
            setPreviewColorHex(event.target.value);
          }
        }}
        defaultValue={colorHex ?? undefined}
      />
      <Form.Separator />
      <Form.Description text="Following is preview only. No need to fill anything in." />
      <Form.TagPicker id="preview" title="Label Preview" defaultValue={previewTitle ? [previewTitle] : []}>
        {previewColorHex && previewTitle && (
          <Form.TagPicker.Item
            key={previewTitle}
            title={previewTitle}
            value={previewTitle}
            icon={labelIcon({ uuid: "", title: previewTitle, colorHex: previewColorHex })}
          />
        )}
      </Form.TagPicker>
    </Form>
  );
}
