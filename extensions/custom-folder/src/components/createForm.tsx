import { useNavigation } from "@raycast/api";
import { FolderForm, PathError } from "../types";
import Result from "../result";
import { useState } from "react";
import { isNonEmptyDirectory, isNonEmptyFile } from "../utils/verifications";
import { CustomForm } from "./customForm";

export default function CreateForm() {
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

  return <CustomForm handleSubmit={handleSubmit} withFilePicker pathError={pathError} setPathError={setPathError} />;
}
