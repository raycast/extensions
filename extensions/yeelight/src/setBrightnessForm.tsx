import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";

interface Props {
  currBright: number;
  onSetBrightness: ({ bright, index }: { bright: number; index: number }) => void;
  index: number;
}

export default function SetBrightnessForm(props: Props) {
  const { currBright, onSetBrightness, index } = props;
  const [bright, setBright] = useState<number>(currBright);
  const { pop } = useNavigation();

  function onBrightnessChange(value: string) {
    setBright(Number(value));
  }

  function handleSubmit() {
    onSetBrightness({ bright, index });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Brightness" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        placeholder={currBright.toString()}
        onChange={(e: string) => onBrightnessChange(e)}
        id="brightness"
        title="Brightness"
      />
    </Form>
  );
}
