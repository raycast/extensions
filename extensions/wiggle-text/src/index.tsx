import { Form, ActionPanel, Action, showToast, Clipboard, Detail } from "@raycast/api";
import { useState } from "react";
import WiggleMaker from "./wiggle";

type Values = {
  textfield: string;
  height: string;
  width: string;
  ease: string;
};

export default function Command() {
  async function handleSubmit(values: Values) {
    const wiggle = generateWiggle(values);
    Clipboard.copy(wiggle).then(() => {
      showToast({ title: "Copied", message: "Successfully copied wiggle to your clipboard" });
    });
  }

  const [heightError, setHeightError] = useState<string | undefined>();
  const [widthError, setWidthError] = useState<string | undefined>();
  const [emptyError, setEmptyError] = useState<string | undefined>();

  const dropError = {
    height: () => heightError && heightError.length > 0 && setHeightError(undefined),
    width: () => widthError && widthError.length > 0 && setWidthError(undefined),
    empty: () => {
      emptyError && emptyError.length > 0 && setEmptyError(undefined);
    },
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="textfield"
        title="Wiggle text"
        placeholder="Enter text"
        error={emptyError}
        onChange={dropError.empty}
        onBlur={(e) => {
          const val = e.target.value;
          if (val?.length === 0) setEmptyError("Please enter a text");
          else dropError.empty();
        }}
      />
      <Form.TextField
        id="height"
        title="Wiggle height"
        placeholder="Number between 3 - 100"
        defaultValue="20"
        error={heightError}
        onChange={dropError.height}
        onBlur={(e) => {
          const val = parseInt(e.target.value || "");
          if (isNaN(val)) setHeightError("Please enter a number");
          else if (val < 3 || val > 100) setHeightError("Out of range (3 - 100)");
          else dropError.height();
        }}
      />
      <Form.TextField
        id="width"
        title="Wiggle width"
        placeholder="Number between 3 - 100"
        defaultValue="20"
        error={widthError}
        onChange={dropError.width}
        onBlur={(e) => {
          const val = parseInt(e.target.value || "");
          if (isNaN(val)) setWidthError("Please enter a number");
          else if (val < 3 || val > 100) setWidthError("Out of range (3 - 100)");
          else dropError.width();
        }}
      />
      <Form.Dropdown id="ease" title="Curve type (ease)">
        <Form.Dropdown.Item value="quadratic" title="Quadratic" />
        <Form.Dropdown.Item value="linear" title="Linear" />
        <Form.Dropdown.Item value="sine" title="Sine" />
        <Form.Dropdown.Item value="cubic" title="Cubic" />
        <Form.Dropdown.Item value="exponential" title="Exponential" />
        <Form.Dropdown.Item value="quartIn" title="Ease in" />
        <Form.Dropdown.Item value="quartOut" title="Ease out" />
      </Form.Dropdown>
      <Form.Separator></Form.Separator>
      <Form.Description text="Once you submit the form, the wiggle will be copied to your clipboard." />
    </Form>
  );
}

function generateWiggle(values: Values): string {
  const maker = new WiggleMaker();
  return maker.generateWiggle(+values.height, +values.width, values.textfield, values.ease);
}
