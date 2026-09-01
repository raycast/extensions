import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { TOTAL_MATCHWEEKS } from "../utils";

const sanitize = (next: string, previous: string): string => {
  const digits = next.replace(/[^0-9]/g, "");

  if (!digits) {
    return "";
  }

  const value = Number(digits);

  return value >= 1 && value <= TOTAL_MATCHWEEKS ? String(value) : previous;
};

export default function JumpToMatchweek(props: {
  current?: number;
  onJump: (matchweek: number) => void;
}) {
  const { pop } = useNavigation();
  const [value, setValue] = useState<string>(
    props.current ? String(props.current) : "",
  );

  const onSubmit = () => {
    const matchweek = Number(value);

    if (matchweek >= 1 && matchweek <= TOTAL_MATCHWEEKS) {
      props.onJump(matchweek);
    }

    pop();
  };

  return (
    <Form
      navigationTitle="Jump to Matchweek"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Jump to Matchweek"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: [], key: "return" }}
            onSubmit={onSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="matchweek"
        title="Matchweek"
        placeholder={`1 to ${TOTAL_MATCHWEEKS}`}
        value={value}
        onChange={(next) => setValue(sanitize(next, value))}
      />
      <Form.Description
        text={`Matchweeks run from 1 to ${TOTAL_MATCHWEEKS}.`}
      />
    </Form>
  );
}
