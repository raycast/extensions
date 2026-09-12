import { Form, ActionPanel, Action, popToRoot, useNavigation, List, Icon } from "@raycast/api";
import { convertToLightning } from "../lib/convert";
import getColors from "../lib/colors";
import ColorListItem from "./components/color-list-item";

type Values = {
  textfield: string;
  textarea: string;
  datepicker: Date;
  checkbox: boolean;
  dropdown: string;
  tokeneditor: string[];
};

export default function Command() {
  const { push } = useNavigation();

  function handleSubmit(values: Values) {
    const time = values.datepicker;
    if (!time) {
      return popToRoot();
    }
    const { lightningString, originalTimeString } = convertToLightning(time);
    push(<Result lightningString={lightningString} originalTimeString={originalTimeString} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" icon={Icon.Switch} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="datepicker" title="Time" />
    </Form>
  );
}

function Result({ lightningString, originalTimeString }: { lightningString: string; originalTimeString: string }) {
  const colors = getColors(lightningString);
  const noCharges = lightningString.split("|")[0] || lightningString;
  return (
    <List searchBarPlaceholder={originalTimeString} enableFiltering={false}>
      <List.Item
        title={lightningString}
        icon={Icon.Clock}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Lightning Time" content={lightningString} />
            <Action.CopyToClipboard title="Copy Without Charges" content={noCharges} />
          </ActionPanel>
        }
      />
      {Object.values(colors).map((color) => (
        <ColorListItem colors={colors} key={color} color={color} />
      ))}
    </List>
  );
}
