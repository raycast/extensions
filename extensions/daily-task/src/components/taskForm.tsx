import { Form, ActionPanel, useNavigation, Action, Color, Icon } from "@raycast/api";
import { useState } from "react";
import { taskItemType } from "../common/types";
import { useAtom } from "jotai";
import { dataAtom } from "../common/atoms";

export default function TaskForm({ taskId }: { taskId: string }) {
  const [DATA, SetData] = useAtom(dataAtom);

  const [titleError, setTitleError] = useState<string | undefined>();
  const [durationError, setDurationError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>();
  let formData: taskItemType = {
    id: "",
    color: "raycast-blue",
    icon: "circle-filled-16",
    title: "",
    desc: "",
    duration: "60",
    disabled: false,
    ts: 0,
    sec: 0,
  };

  const { pop } = useNavigation();

  const titleErrorValid = () => {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  };

  const durationErrorValid = () => {
    if (durationError && durationError.length > 0) {
      setDurationError(undefined);
    }
  };

  const isInt = (v: string | undefined) => {
    if (v == undefined) {
      return false;
    }
    const reg = /^[1-9][0-9]*$/;
    return reg.test(v);
  };

  const genId = () => {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  const submit = (sd: taskItemType) => {
    if (sd.title == "") {
      setTitleError("The field should't be empty!");
      return;
    }
    if (!isInt(sd.duration)) {
      setDurationError("The field need a integer!");
      return;
    }
    setIsLoading(true);
    const d = JSON.parse(JSON.stringify(DATA));
    sd.sec = formData.sec;
    sd.ts = formData.ts;
    if (taskId == "add") {
      sd.id = genId();
      d.push(sd);
    } else {
      sd.id = taskId;
      for (const i in d) {
        if (d[i].id == taskId) {
          d[i] = sd;
          break;
        }
      }
    }
    SetData(d);
    setIsLoading(false);
    pop();
  };

  if (taskId != "add") {
    const d = JSON.parse(JSON.stringify(DATA));
    for (const i in d) {
      if (d[i].id == taskId) {
        formData = d[i];
        break;
      }
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        info="required"
        defaultValue={formData?.title}
        error={titleError}
        onChange={titleErrorValid}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setTitleError("The field should't be empty!");
          } else {
            titleErrorValid();
          }
        }}
        autoFocus
      />
      <Form.TextField id="desc" defaultValue={formData?.desc} title="Description" />
      <Form.TextField
        id="duration"
        title="Duration"
        info="(minute) required"
        error={durationError}
        defaultValue={String(formData?.duration)}
        onChange={durationErrorValid}
        onBlur={(event) => {
          const v = event.target.value;
          if (v?.length == 0) {
            setDurationError("The field should't be empty!");
          } else if (!isInt(v)) {
            setDurationError("The field need a integer!");
          } else {
            durationErrorValid();
          }
        }}
      />
      <Form.Dropdown id="color" title="Color" defaultValue={formData?.color}>
        <Form.Dropdown.Item
          icon={{ source: Icon.CircleFilled, tintColor: Color.Blue }}
          value="raycast-blue"
          title="Blue"
        />
        <Form.Dropdown.Item
          icon={{ source: Icon.CircleFilled, tintColor: Color.Red }}
          value="raycast-red"
          title="Red"
        />
        <Form.Dropdown.Item
          icon={{ source: Icon.CircleFilled, tintColor: Color.Green }}
          value="raycast-green"
          title="Green"
        />
        <Form.Dropdown.Item
          icon={{ source: Icon.CircleFilled, tintColor: Color.Orange }}
          value="raycast-orange"
          title="Orange"
        />
        <Form.Dropdown.Item
          icon={{ source: Icon.CircleFilled, tintColor: Color.Yellow }}
          value="raycast-yellow"
          title="Yellow"
        />
        <Form.Dropdown.Item
          icon={{ source: Icon.CircleFilled, tintColor: Color.Magenta }}
          value="raycast-magenta"
          title="Magenta"
        />
        <Form.Dropdown.Item
          icon={{ source: Icon.CircleFilled, tintColor: Color.Purple }}
          value="raycast-purple"
          title="Purple"
        />
      </Form.Dropdown>
      <Form.Dropdown id="icon" title="Icon" defaultValue={formData?.icon}>
        <Form.Dropdown.Item icon={Icon.CircleFilled} value="circle-filled-16" title="CircleFilled" />
        <Form.Dropdown.Item icon={Icon.Circle} value="circle-16" title="Circle" />
        <Form.Dropdown.Item icon={Icon.Code} value="code-16" title="Code" />
        <Form.Dropdown.Item icon={Icon.Book} value="book-16" title="Book" />
        <Form.Dropdown.Item icon={Icon.Bolt} value="bolt-16" title="Bolt" />
        <Form.Dropdown.Item icon={Icon.Weights} value="weights-16" title="Weights" />
        <Form.Dropdown.Item icon={Icon.Glasses} value="glasses-16" title="Glasses" />
        <Form.Dropdown.Item icon={Icon.Hammer} value="hammer-16" title="Hammer" />
        <Form.Dropdown.Item icon={Icon.Brush} value="brush-16" title="Brush" />
        <Form.Dropdown.Item icon={Icon.Emoji} value="emoji-16" title="Emoji" />
        <Form.Dropdown.Item icon={Icon.Info} value="info=01-16" title="Info" />
        <Form.Dropdown.Item icon={Icon.Message} value="speech-bubble-16" title="Message" />
        <Form.Dropdown.Item icon={Icon.QuestionMark} value="question-mark-circle-16" title="QuestionMark" />
        <Form.Dropdown.Item icon={Icon.Flag} value="flag-16" title="Flag" />
        <Form.Dropdown.Item icon={Icon.Goal} value="goal-16" title="Goal" />
      </Form.Dropdown>
      <Form.Checkbox id="disabled" label="disabled?" title="Disabled" defaultValue={formData?.disabled} />
    </Form>
  );
}
