import { Form, ActionPanel, Action, getPreferenceValues, openExtensionPreferences, LaunchProps } from "@raycast/api";
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
  template: string;
}

function formatDateTime(date: Date, format: string) {
  const tokens: { [key: string]: string } = {
    // Add index signature to tokens object
    YYYY: date.getFullYear().toString(),
    YY: date.getFullYear().toString().slice(-2),
    MM: (date.getMonth() + 1).toString().padStart(2, "0"),
    DD: date.getDate().toString().padStart(2, "0"),
    HH: date.getHours().toString().padStart(2, "0"),
    mm: date.getMinutes().toString().padStart(2, "0"),
    ss: date.getSeconds().toString().padStart(2, "0"),
  };

  return format.replace(/YYYY|YY|MM|DD|HH|mm|ss/g, (match) => tokens[match]);
}

function replaceDatePlaceholders(date: Date, text: string): string {
  return text.replace(/{{date:([^}]+)}}/g, (_, dateFormat) => formatDateTime(date, dateFormat));
}

export default function Command(props: LaunchProps<{ draftValues: Memo }>) {
  const preferences = getPreferenceValues<Preferences>();
  const { directory, format, prefix, template } = preferences;
  const { draftValues } = props;

  function saveMemo(values: Memo) {
    const filePath = path.join(directory, formatDateTime(new Date(), format));
    let memo = formatDateTime(new Date(), prefix) + values.memo + "\n";
    // ファイルが存在しない場合は、ファイルの先頭にテンプレートを追加する
    if (!fs.existsSync(filePath)) {
      // テンプレートのファイルパスのファイルないの文字列を取得する
      const templateContent = fs.readFileSync(template, "utf8");
      memo = replaceDatePlaceholders(new Date(), templateContent) + "\n" + memo;
    }
    fs.appendFileSync(filePath, memo);
  }
  const { handleSubmit, reset, itemProps } = useForm<Memo>({
    onSubmit(values) {
      saveMemo(values);
      reset();
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
      <Form.TextArea title="Memo" {...itemProps.memo} defaultValue={draftValues?.memo} />
    </Form>
  );
}
