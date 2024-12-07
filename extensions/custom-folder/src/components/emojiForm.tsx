import { useNavigation } from "@raycast/api";
import { FolderForm } from "../types";
import Result from "../result";
import { isNonEmptyDirectory } from "../utils/verifications";
import { homedir } from "os";
import { CustomForm } from "./customForm";

export default function EmojiForm({ file }: { file: string | string[] }) {
  const DOWNLOADS_DIR = `${homedir()}/Downloads`;
  const { push } = useNavigation();
  function handleSubmit(values: FolderForm) {
    const outputFolder = values.output && values.output?.length > 0 ? values.output[0] : "";
    if (outputFolder && !isNonEmptyDirectory(outputFolder)) {
      return false;
    }

    push(
      <Result
        formValues={{
          ...values,
          file,
          padding: parseInt(values.padding as string),
          output: values?.output?.length === 0 ? [DOWNLOADS_DIR] : values?.output,
        }}
        fromEmoji
      />,
    );
  }

  return <CustomForm handleSubmit={handleSubmit} defaultOutput={"/Downloads"} defaultPadding={"60"} />;
}
