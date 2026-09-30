import React from "react";
import {
  Action,
  ActionPanel,
  Form,
  Toast,
  getPreferenceValues,
  getSelectedText,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import AuthenticatedView from "./components/AuthenticatedView";
import { sendEmail } from "./lib/gmail";

function EmailMe() {
  const preferences = getPreferenceValues<Preferences>();
  const { defaultAddresses, defaultSubject } = preferences;
  const defaultAddressesArray = defaultAddresses.split(",").map((x) => x.trim());

  const [subject, setSubject] = React.useState(defaultSubject);
  const [body, setBody] = React.useState("");
  const [addresses, setAddresses] = React.useState([defaultAddressesArray[0]]);
  const [additionalAddresses, setAdditionalAddresses] = React.useState([""]);

  React.useEffect(() => {
    (async () => {
      try {
        const selectedText = await getSelectedText();
        setBody(selectedText);
      } catch (error) {
        console.log("No text selected");
      }
    })();
  }, []);

  const send = async () => {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Sending...",
        message: "Sending email",
      });

      const [firstAddress, ...restAddresses] = addresses;

      const toAddress = firstAddress ? firstAddress : additionalAddresses[0];

      if (!toAddress) {
        return await showToast({
          style: Toast.Style.Failure,
          title: "Missing recipient",
          message: "Specify at least one recipient",
        });
      }
      const bccAddresses = [...restAddresses, ...additionalAddresses];

      await sendEmail(subject, body, toAddress, bccAddresses);
      showHUD("Email sent!");
      popToRoot();
    } catch (error) {
      const err = error as unknown as { response: { body: string } };
      console.log(error);
      if (err.response) {
        return await showToast({
          style: Toast.Style.Failure,
          title: "Email failed",
          message: err.response.body,
        });
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Send" onAction={() => send()} />
        </ActionPanel>
      }
    >
      {defaultAddressesArray.map((address, index) => (
        <Form.Checkbox
          key={address}
          id={address}
          title={index === 0 ? `Default Recipients` : ``}
          label={address}
          value={addresses.includes(address)}
          onChange={(checked) => {
            if (checked) {
              if (addresses.includes(address)) return;
              setAddresses((addresses) => [...addresses, address]);
            } else {
              setAddresses((addresses) => addresses.filter((x) => x !== address));
            }
          }}
        />
      ))}
      <Form.TextField
        id="bcc"
        title="BCC"
        placeholder="john@dash.com, doe@off.com"
        value={additionalAddresses.join("\n")}
        onChange={(value) => {
          setAdditionalAddresses(value.split("\n"));
        }}
        info="Comma separated list of email addresses"
      />

      <Form.TextField id="subject" title="Subject" value={subject} onChange={setSubject} />

      <Form.TextArea
        autoFocus
        id="note"
        title="Message"
        placeholder="A quick reminder to myself"
        value={body}
        onChange={setBody}
      />
    </Form>
  );
}

export default function Command() {
  return (
    <AuthenticatedView>
      <EmailMe />
    </AuthenticatedView>
  );
}
