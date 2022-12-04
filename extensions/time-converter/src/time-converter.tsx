import { List, Form, ActionPanel, Action, showToast, useNavigation, Toast } from "@raycast/api";
import dayjs from "dayjs";

export default function main() {
  const { push } = useNavigation();

  function timeConverter(time: string, format: string) {
    if (time === "now") {
      const now = dayjs();
      const date = now.format(format);
      const timestamp = now.valueOf().toString();
      const unix = now.unix().toString();
      push(
        <List>
          <List.Item title={date} actions={<Actions item={{ content: date }} />}></List.Item>
          <List.Item title={timestamp} actions={<Actions item={{ content: timestamp }} />}></List.Item>
          <List.Item title={unix} actions={<Actions item={{ content: unix }} />}></List.Item>
        </List>
      );
    } else {
      const timestamp = Number(time);
      if (isNaN(timestamp)) {
        console.debug("date");
        if (dayjs(timestamp).isValid()) {
          push(resultList(dayjs(timestamp).valueOf().toString()));
        } else {
          showToast({ style: Toast.Style.Failure, title: "Error: ", message: "Invalid date" });
        }
      } else {
        console.debug("timestamp");
        if (timestamp > 1000000000000) {
          push(resultList(dayjs(timestamp).format(format)));
        } else {
          push(resultList(dayjs(timestamp * 1000).format(format)));
        }
      }
    }
  }

  function resultList(time: string) {
    return (
      <List>
        <List.Item title={time.toString()} actions={<Actions item={{ content: time }} />}></List.Item>
      </List>
    );
  }

  type ActionItem = {
    item: {
      content: string;
    };
  };

  function Actions({ item }: ActionItem) {
    return (
      <ActionPanel>
        <Action.CopyToClipboard content={item.content} />
        <Action.Paste content={item.content} />
      </ActionPanel>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Form" onSubmit={(value) => timeConverter(value.time, value.format)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="time" defaultValue="now" placeholder="Enter timestamp, datetime string, or 'now'." />
      <Form.Dropdown id="format" title="Format">
        <Form.Dropdown.Item value="YYYY-MM-DD HH:mm:ss" title="yyyy-MM-dd HH:mm:ss" />
        <Form.Dropdown.Item value="YYYY-MM-DD HH:mm:ss.SSS" title="yyyy-MM-dd HH:mm:ss.SSS" />
        <Form.Dropdown.Item value="YYYY-MM-DD hh:mm:ss A" title="yyyy-MM-dd hh:mm:ss A" />
        {/* <Form.Dropdown.Item value="YYYY/MM/DD HH:mm:ss" title="yyyy/MM/dd HH:mm:ss" />
        <Form.Dropdown.Item value="YYYY/MM/DD hh:mm:ss A" title="yyyy/MM/dd hh:mm:ss A" /> */}
      </Form.Dropdown>
    </Form>
  );
}
