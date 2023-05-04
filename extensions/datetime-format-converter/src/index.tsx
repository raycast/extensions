import { Form, List, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import dayjs from "dayjs";

export default function main() {
  const { push } = useNavigation();

  function isValidFormat(format: string) {
    const regex = /^((Y{2,4})|(M{1,2})|(D{1,2})|(H{1,2})|(h{1,2})|(m{1,2})|(s{1,2})|(A{1})|(a{1})|(Z{1,2})){1,}$/;
    return regex.test(format);
  }

  function timeConverter(values: Form.Values) {
    const time = values.time;
    const format = values.timeFormat;
    if (!time || time === "now") {
      push(ResultList(formatTime(new Date().toString(), format)));
    } else {
      const dTime = dayjs(time);
      if (dTime.isValid()) {
        push(ResultList(formatTime(time, format)));
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

  function formatTime(time: string, format: string) {
    let dTime;

    if (!isValidFormat(format)) {
      showError();
      return [];
    }

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
      dTime.format(format).toString(),
      dTime.format("YYYY-MM-DD").toString(),
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
          <Action.SubmitForm title="Submit Form" onSubmit={(values) => timeConverter(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="time" defaultValue="now" placeholder="Enter timestamp, datetime string, or 'now'." />
      <Form.TextField id="timeFormat" defaultValue="YYYYMMDD" placeholder="Enter format, YYYY-MM-DD hh:mm:ss" />
    </Form>
  );
}
