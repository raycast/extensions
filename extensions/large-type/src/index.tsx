import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  environment,
  Form,
  popToRoot,
  useNavigation,
} from "@raycast/api";
import { renderToString } from "react-dom/server";
interface CommandForm {
  text: string;
}

function renderText(text: string) {
  const img = (
    <svg viewBox={`0 0 400 700`} xmlns="http://www.w3.org/2000/svg">
      <text
        x="50%"
        y="50%"
        fill={environment.theme === "dark" ? "#fff" : "#000"}
        fontSize="200"
        fontFamily="-apple-system"
        textLength="700"
        lengthAdjust="spacing"
      >
        {text}
      </text>
    </svg>
  );

  return `<img height="400" width="700" src="data:image/svg+xml,${encodeURIComponent(renderToString(img))}" />`;
}

export default function Command() {
  const { push, pop } = useNavigation();

  async function closeWindow() {
    await closeMainWindow();
    await popToRoot({ clearSearchBar: true });
  }

  function handleSubmit(values: CommandForm) {
    if (values.text !== "") {
      push(
        <Detail
          markdown={renderText(values.text)}
          actions={
            <ActionPanel title="Large Type control">
              <Action title="Back" shortcut={{ modifiers: ["cmd"], key: "enter" }} onAction={() => pop()} />
              <Action
                title="Close Window"
                shortcut={{ modifiers: ["cmd"], key: "escape" }}
                onAction={() => closeWindow()}
              />
            </ActionPanel>
          }
        />
      );
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text" placeholder="Enter Text" defaultValue="" />
    </Form>
  );
}
