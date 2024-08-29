import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { FolderForm, PathError } from "./types";
import Result from "./result";
import { useState } from "react";
import { isNonEmptyDirectory, isNonEmptyFile, isPngFile } from "./utils/verifications";

export default function CreateForm() {
  const [paddingError, setPaddingError] = useState<string | undefined>();
  const [pathError, setPathError] = useState<PathError>({
    imagePath: undefined,
    outputPath: undefined,
  });

  const { push } = useNavigation();
  function handleSubmit(values: FolderForm) {
    const file = values.file[0];
    const outputFolder = values.output && values.output?.length > 0 ? values.output[0] : "";
    if (!isNonEmptyFile(file)) {
      setPathError({ ...pathError, imagePath: "Field shouldn't be empty!" });
      return false;
    }

    if (outputFolder && !isNonEmptyDirectory(outputFolder)) {
      return false;
    }
    push(<Result formValues={{ ...values, padding: parseInt(values.padding as string) }} />);
  }

  function dropPaddingErrorIfNeeded() {
    if (paddingError && paddingError.length > 0) {
      setPaddingError(undefined);
    }
  }
  function dropPathErrorIfNeeded(stringPath: string, dir?: boolean) {
    if (!dir) {
      if (isPngFile(stringPath) && isNonEmptyFile(stringPath)) {
        setPathError({
          ...pathError,
          imagePath: undefined,
        });
      } else if (!isPngFile(stringPath)) setPathError({ ...pathError, imagePath: "File should be a PNG!" });
    } else {
      if (isNonEmptyDirectory(stringPath)) {
        setPathError({
          ...pathError,
          outputPath: undefined,
        });
      }
    }
  }

  return (
    <Form
      navigationTitle={"Custom folder"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Custom Folder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Image path"
        allowMultipleSelection={false}
        info={"The png image."}
        defaultValue={[]}
        onChange={(newValue: string[]) => {
          dropPathErrorIfNeeded(newValue[0] || "");
        }}
        error={pathError?.imagePath}
        onBlur={(event) => {
          dropPathErrorIfNeeded(event?.target?.value?.[0] || "");
        }}
      />
      <Form.FilePicker
        id="targetFolderPath"
        title="Target path"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        info={"Optional path to the folder you want to customize."}
      />
      <Form.FilePicker
        id="output"
        title="Output path"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        info={"Optional output path (default is image path)."}
      />
      <Form.TextField
        id="padding"
        title={"Padding"}
        defaultValue="45"
        info={"Optional image padding parameter (default is 45)."}
        error={paddingError}
        onChange={dropPaddingErrorIfNeeded}
        onBlur={(event) => {
          const parsedInt = parseInt(event.target.value || "");
          if (event.target.value?.length == 0) {
            setPaddingError("The field shouldn't be empty!");
          } else if (isNaN(parsedInt) || !Number.isFinite(parsedInt)) {
            setPaddingError("Should be an integer!");
          } else {
            dropPaddingErrorIfNeeded();
          }
        }}
      />
      <Form.Checkbox
        id="shades"
        title={"Shades"}
        label="Enable shades"
        defaultValue={true}
        info={"Toggle the shading effect on the image, switching between a filled mask and shaded tones."}
      />
    </Form>
  );
}
