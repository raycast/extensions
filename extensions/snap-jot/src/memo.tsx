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

function formatDateTime(date: Date, format: string, is12: boolean = false) {
  const hours = date.getHours();
  const isAM = hours < 12 || hours === 24;
  const ampm = isAM ? "AM" : "PM";
  const hours12 = (hours % 12 || 12).toString().padStart(2, "0");

  const tokens: { [key: string]: string } = {
    YYYY: date.getFullYear().toString(),
    YY: date.getFullYear().toString().slice(-2),
    MM: (date.getMonth() + 1).toString().padStart(2, "0"),
    DD: date.getDate().toString().padStart(2, "0"),
    HH: is12 ? hours12 : date.getHours().toString().padStart(2, "0"),
    mm: date.getMinutes().toString().padStart(2, "0"),
    ss: date.getSeconds().toString().padStart(2, "0"),
    A: is12 ? ampm : "",
  };

  console.log(
    "prefix",
    format.replace(/YYYY|YY|MM|DD|HH|mm|ss|A/g, (match) => tokens[match]),
  );
  return format.replace(/YYYY|YY|MM|DD|HH|mm|ss|A/g, (match) => tokens[match]);
}

function replaceDatePlaceholders(date: Date, text: string): string {
  return text.replace(/{{date:([^}]+)}}/g, (_, dateFormat) => formatDateTime(date, dateFormat));
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
      const memo = formatDateTime(new Date(), timestamp, timeFormat === "12") + values.memo + "\n";
      let memoContent = memo;
      // if file is not exist, create file and write memo.
      if (!fs.existsSync(filePath)) {
        // if template is empyt, content is empty.
        const templateContent = !template ? "" : fs.readFileSync(template, "utf8");
        memoContent = replaceDatePlaceholders(new Date(), templateContent) + "\n" + memo;
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
