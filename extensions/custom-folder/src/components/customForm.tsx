import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { isNonEmptyDirectory, isNonEmptyFile, isPngFile } from "../utils/verifications";
import { FolderForm, PathError } from "../types";

export const CustomForm = ({
  handleSubmit,
  withFilePicker = false,
  defaultOutput = "image path",
  defaultPadding = "45",
  pathError,
  setPathError,
}: {
  handleSubmit: (values: FolderForm) => void;
  withFilePicker?: boolean;
  defaultOutput?: string;
  defaultPadding?: string;
  pathError?: PathError;
  setPathError?: (pathError: PathError) => void;
}) => {
  const [paddingError, setPaddingError] = useState<string | undefined>();
  function dropPaddingErrorIfNeeded() {
    if (paddingError && paddingError.length > 0) {
      setPaddingError(undefined);
    }
  }
  function dropPathErrorIfNeeded(stringPath: string, dir?: boolean) {
    if (!dir) {
      if (isPngFile(stringPath) && isNonEmptyFile(stringPath) && pathError && setPathError) {
        setPathError({
          ...pathError,
          imagePath: undefined,
        });
      } else if (!isPngFile(stringPath) && pathError && setPathError)
        setPathError({ ...pathError, imagePath: "File should be a PNG!" });
    } else {
      if (isNonEmptyDirectory(stringPath) && pathError && setPathError) {
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
      {withFilePicker && (
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
      )}
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
        title="Download path"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        info={`Optional download path (default is ${defaultOutput}).`}
      />
      <Form.TextField
        id="padding"
        title={"Padding"}
        defaultValue={defaultPadding}
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
};
