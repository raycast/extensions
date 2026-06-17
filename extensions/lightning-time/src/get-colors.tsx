import { Form, ActionPanel, Action, useNavigation, List, showToast, Toast, Icon } from "@raycast/api";
import getColors from "../lib/colors";
import ColorListItem from "./components/color-list-item";
import { useState } from "react";
import validate from "../lib/validate";
import randomTimeString from "../lib/random-time-string";

export default function Command() {
  const { push } = useNavigation();
  const [timeString, setTimeString] = useState("");
  const [randomTime] = useState(randomTimeString());

  function handleSubmit() {
    const isValid = validate(timeString);
    if (isValid) {
      const colors = getColors(timeString);
      push(<Result lightningString={timeString} colors={colors} />);
    } else {
      showToast({ style: Toast.Style.Failure, title: "Invalid time string", message: `Try ${randomTime}` });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Colors" icon={Icon.EyeDropper} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="time" title="Lightning Time" placeholder={randomTime} onChange={setTimeString} />
    </Form>
  );
}

function Result({
  colors,
  lightningString,
}: {
  colors: {
    boltColor: string;
    zapColor: string;
    sparkColor: string;
  };
  lightningString: string;
}) {
  return (
    <List searchBarPlaceholder={lightningString} enableFiltering={false}>
      {Object.values(colors).map((color) => (
        <ColorListItem colors={colors} key={color} color={color} />
      ))}
    </List>
  );
}
