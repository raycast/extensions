import { Action, ActionPanel, Form } from "@raycast/api";
import { FunctionComponent, useContext } from "react";
import { useConfigure } from "../hook/useConfigure";
import { MessageContext } from "../context/MessageContext";

export const Configure: FunctionComponent = () => {
  const { state, isLoading, onSubmit } = useConfigure();
  const m = useContext(MessageContext);

  if (isLoading) {
    return null;
  }
  return (
    <Form
      navigationTitle={m((l) => l.Setting)}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={m((l) => l.Save)} onSubmit={onSubmit} />
          <Action.OpenInBrowser
            title={m((l) => l.IssuingPapagoToken)}
            url="https://developers.naver.com/apps/#/register"
          />
        </ActionPanel>
      }
    >
      <Form.Description title={m(l => l.Papago)} text={m(l => l.IssueATokenFromTheBottomMenu)} />
      {Object.entries(ID_PALCEHOLDER_PAIR).map(([id, placeholder]) => (
        <Form.TextField key={id} id={id} title={id} placeholder={placeholder} defaultValue={state[id]} />
      ))}
      <Form.Separator />
    </Form>
  );
};

const ID_PALCEHOLDER_PAIR = {
  "X-Naver-Client-Id": "xxxxxxxxxxxxxxxxxxxx",
  "X-Naver-Client-Secret": "xxxxxxxxxx",
};
