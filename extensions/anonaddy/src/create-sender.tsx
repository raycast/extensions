import { Action, ActionPanel, Clipboard, Form, PopToRootType, getSelectedText, showHUD } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";

import useAliases from "./useAliases";

type FormValues = {
  sender: string;
  recipient: string;
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const CreateSender = () => {
  const aliases = useAliases();
  const candidate = usePromise(getSelectedText);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      sender: "",
      recipient: isValidEmail(candidate.data ?? "") ? candidate.data : "",
    },
    async onSubmit(values) {
      const { sender, recipient } = values;

      const [local, domain] = sender.split("@");
      const [toUser, toDomain] = recipient.split("@");

      const composed = `${local}+${toUser}=${toDomain}@${domain}`;

      // Copy to clipboard
      await Clipboard.copy(composed);

      // Show success message
      await showHUD(`${composed} copied to clipboard`, { popToRootType: PopToRootType.Immediate });
    },
    validation: {
      sender: (value) => {
        if (!value) {
          return "Please select a sender alias";
        }

        if (!isValidEmail(value)) {
          return "Please enter a valid email address";
        }
      },
      recipient: (value) => {
        if (!value) {
          return "Please enter a recipient email";
        }

        if (!isValidEmail(value)) {
          return "Please enter a valid email address";
        }
      },
    },
  });

  const isLoading = aliases.isLoading || candidate.isLoading;

  return (
    <Form
      actions={
        !isLoading && (
          <ActionPanel>
            <Action.SubmitForm title="Create Sender" onSubmit={handleSubmit} />
          </ActionPanel>
        )
      }
      isLoading={isLoading}
    >
      {isLoading ? (
        <Form.Description text="Loading your aliases..." />
      ) : (
        <>
          <Form.Dropdown {...itemProps.sender} title="Sender Alias" info="Select one of your Addy aliases to send from">
            {(aliases.data ?? []).map((alias) => (
              <Form.Dropdown.Item key={alias.id} title={alias.email} value={alias.email} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            {...itemProps.recipient}
            title="Recipient"
            placeholder="Enter recipient email address"
            info="The email address you want to send to"
          />
        </>
      )}
    </Form>
  );
};

export default CreateSender;
