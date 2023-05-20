import { List, LaunchProps, ActionPanel, Action } from "@raycast/api";
import { ObjectId } from "mongodb";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

interface CommandArguments {
  input_id: string;
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

function RenderResult(times: string[]) {
  return (
    <List>
      {times.map((time, index) => (
        <List.Item key={index} title={time} actions={<Actions item={{ content: time }} />} />
      ))}
    </List>
  );
}

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { input_id } = props.arguments;
  const object_id = new ObjectId(input_id);
  const date = object_id.getTimestamp();
  const d = dayjs(date);
  return RenderResult([d.unix().toString(), d.valueOf().toString(), d.format(), d.utc().format()]);
}
