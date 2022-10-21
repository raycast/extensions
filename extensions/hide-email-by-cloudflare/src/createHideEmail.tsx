import { createRoutingRule } from "./utils";
import { useAllRoutingRules, useGetEmailDomain, useListDestinationAddresses } from "./hooks";

import { useState } from "react";
import cryptoRandomString from "crypto-random-string";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  closeMainWindow,
  popToRoot,
  showHUD,
  Clipboard,
  Toast,
} from "@raycast/api";

type Values = {
  name: string;
  createdEmail: string;
  destinationEmail: string;
};

export default function Command() {
  const { emailDomain, isLoadingGetEmailDomain } = useGetEmailDomain();
  const { allRoutingRules, isLoadingAllRoutingRules } = useAllRoutingRules();
  const { destinationAddresses, isLoadingListDestinationAddresses } = useListDestinationAddresses();

  const [createdEmailError, setCreatedEmailError] = useState<string | undefined>();

  function dropCreatedEmailErrorIfNeeded() {
    if (createdEmailError && createdEmailError.length > 0) {
      setCreatedEmailError(undefined);
    }
  }

  function createDefaultEmail() {
    let randomString: string;

    do {
      randomString = cryptoRandomString({ length: 12, type: "url-safe" });
    } while (allRoutingRules.find((rule) => rule === randomString));

    return randomString;
  }

  async function handleSubmit(values: Values) {
    showToast({ style: Toast.Style.Animated, title: "Creating routing rule..." });
    const success = await createRoutingRule(
      `${values.createdEmail}@${emailDomain}`,
      values.destinationEmail,
      values.name
    );
    closeMainWindow();
    if (success) {
      Clipboard.copy(`${values.createdEmail}@${emailDomain}`);
      showHUD("Ceatd successfully & copied to clipboard");
      popToRoot();
    } else {
      showToast({ title: "Error submitting form", message: "See logs for submitted values" });
    }
  }

  return (
    <Form
      isLoading={isLoadingListDestinationAddresses && isLoadingAllRoutingRules && isLoadingGetEmailDomain}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="This form to create hide email routing rule." />
      <Form.TextField id="name" title="Name" />
      <Form.TextField
        id="createdEmail"
        title="Custom address"
        placeholder="Email prefix"
        defaultValue={createDefaultEmail()}
        error={createdEmailError}
        onChange={dropCreatedEmailErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setCreatedEmailError("Email prefix should't be empty!");
          } else if (event.target.value && event.target.value.length >= 80) {
            setCreatedEmailError("Email prefix should't be longer than 80 characters!");
          } else if (allRoutingRules.find((rule) => rule === event.target.value)) {
            setCreatedEmailError("Email prefix already exists!");
          }
        }}
      />
      <Form.Separator />
      <Form.Dropdown id="destinationEmail" title="Destination address">
        {destinationAddresses.map((address) => (
          <Form.Dropdown.Item value={address} title={address} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
