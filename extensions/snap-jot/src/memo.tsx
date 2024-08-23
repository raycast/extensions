import {
  Form,
  ActionPanel,
  Action,
  getPreferenceValues,
  openExtensionPreferences,
  LaunchProps,
  popToRoot,
  Toast,
  showToast,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import fs from "fs";
import path from "path";
import { formatDateTime, replaceDatePlaceholders } from "./utils/FormatDateTime";

interface Memo {
  memo: string;
}

interface Preferences {
  directory: string;
  format: string;
  prefix: string;
  timeFormat: string;
  template: string;
}

export default function Command(props: LaunchProps<{ draftValues: Memo }>) {
  const preferences = getPreferenceValues<Preferences>();
  const { directory, format, timeFormat, prefix, template } = preferences;
  const { draftValues } = props;

  // if prefix is not include "A" and timeFormat is 12, add "A" to prefix.
  const timestamp = timeFormat === "12" && !prefix.includes("A") ? prefix + "A " : prefix;

  function saveMemo(values: Memo) {
    try {
      const filePath = path.join(directory, formatDateTime(new Date(), format));
      const memo = formatDateTime(new Date(), timestamp, timeFormat === "12") + values.memo;
      let memoContent = memo;
      // if file is not exist, create file and write memo.
      if (!fs.existsSync(filePath)) {
        // if template is empyt, content is empty.
        const templateContent = !template ? "" : fs.readFileSync(template, "utf8");
        memoContent = replaceDatePlaceholders(new Date(), templateContent) + "\n" + memo;
      } else {
        // if file exists, check if it ends with a newline and add one if not
        const existingContent = fs.readFileSync(filePath, "utf8");
        if (!existingContent.endsWith("\n")) {
          fs.appendFileSync(filePath, "\n");
        }
      }
      fs.appendFileSync(filePath, memoContent);
      const successOptions: Toast.Options = {
        style: Toast.Style.Success,
        title: "Memo Saved",
        message: memo,
      };
      showToast(successOptions);
    } catch (error) {
      const failureOptions: Toast.Options = {
        style: Toast.Style.Failure,
        title: "Error Saving Memo",
        message: (error as Error).message,
      };
      showToast(failureOptions);
    }
  }

  const { handleSubmit, reset, itemProps } = useForm<Memo>({
    onSubmit(values) {
      saveMemo(values);
      reset();
      popToRoot();
    },
  });

  return (
    <Form
      enableDrafts={true}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Memo"
        {...itemProps.memo}
        placeholder="Whats on your mind..."
        defaultValue={draftValues?.memo}
      />
    </Form>
  );
}
