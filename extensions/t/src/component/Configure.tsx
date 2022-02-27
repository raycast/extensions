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
      navigationTitle={m((l) => l.setting)}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={m((l) => l.save)} onSubmit={onSubmit} />
          <Action.OpenInBrowser
            title={m((l) => l.issuingPapagoToken)}
            url="https://developers.naver.com/apps/#/register"
          />
        </ActionPanel>
      }
    >
      <Form.Description title={m(l => l.papago)} text={m(l => l.issueATokenFromTheBottomMenu)} />
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
