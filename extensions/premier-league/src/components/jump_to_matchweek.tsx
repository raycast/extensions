import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { TOTAL_MATCHWEEKS } from "../utils";

export default function JumpToMatchweek(props: {
  onJump: (matchweek: number) => void;
}) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();

  const onSubmit = ({ matchweek }: { matchweek: string }) => {
    const value = Number(matchweek.trim());

    if (!Number.isInteger(value) || value < 1 || value > TOTAL_MATCHWEEKS) {
      setError(`Enter a whole number between 1 and ${TOTAL_MATCHWEEKS}`);
      return;
    }

    props.onJump(value);
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
            onSubmit={onSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="matchweek"
        title="Matchweek"
        placeholder={`1 to ${TOTAL_MATCHWEEKS}`}
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}
