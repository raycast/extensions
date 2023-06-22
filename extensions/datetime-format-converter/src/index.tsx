import { Form, List, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import dayjs from "dayjs";

export default function main() {
  const { push } = useNavigation();

  function timeConverter(time: string) {
    if (!time || time === "now") {
      push(ResultList(formatTime(new Date().toString())));
    } else {
      const dTime = dayjs(time);
      if (dTime.isValid()) {
        push(ResultList(formatTime(time)));
      } else {
        showError();
      }
    }
  }

  function showError() {
    showToast({
      style: Toast.Style.Failure,
      title: "An error occurred",
      message: "This is not a time format.",
    });
  }

  function formatTime(time: string) {
    let dTime;
    if (!isNaN(Number(time))) {
      if (time.length == 10) {
        // is unix timestamp seconds
        dTime = dayjs.unix(Number(time));
      } else if (time.length == 13) {
        // is unix timestamp milliseconds
        dTime = dayjs(Number(time));
      } else {
        showError();
        return [];
      }
    } else {
      dTime = dayjs(time);
    }

    return [
      dTime.format("YYYY-MM-DD hh:mm:ss").toString(),
      dTime.format("YYYY-MM-DD hh:mm:ss.SSS").toString(),
      dTime.format().toString(),
      dTime.valueOf().toString(),
      dTime.unix().toString(),
    ];
  }

  function ResultList(times: string[]) {
    return (
      <List>
        {times.map((time, index) => (
          <List.Item key={index} title={time.toString()} actions={<Actions item={{ content: time }} />}></List.Item>
        ))}
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
          <Action.SubmitForm title="Submit Form" onSubmit={(values) => timeConverter(values.time)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="time" defaultValue="now" placeholder="Enter timestamp, datetime string, or 'now'." />
    </Form>
  );
}
