import { Action, ActionPanel, Form, Image, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { Detail } from "@raycast/api";
import QrCode from "qrcode";

const buildQrcode = (searchText: any) => {
  const {push} = useNavigation();

  const onSubmit = (): void => {
    // gen qrcode img
    QrCode.toDataURL(searchText, (err, dataURL) => {
      console.log(dataURL);
      if(!searchText) return;
      push(<Detail markdown={`![](${dataURL})`}></Detail>);
    });
  }
  return (
    <ActionPanel>
      <Action.SubmitForm title="submit" onSubmit={onSubmit}></Action.SubmitForm>
    </ActionPanel>
  )
}

const genForm = () => {
  const [searchText, setSearchText] = useState<string>("");
  return (
    <Form actions={buildQrcode(searchText)}>
      <Form.TextArea id="search" placeholder="please enter text" title="words to be translated" value={searchText} onChange={setSearchText}></Form.TextArea>
    </Form>
  )
}

export default function Command() {
  return genForm()
}
