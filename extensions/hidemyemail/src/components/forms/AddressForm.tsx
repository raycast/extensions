import { Form, Action, ActionPanel, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState, useRef } from "react";
import { iCloudService } from "../../api/connect";
import { MetaData } from "../../api/hide-my-email";

interface AddressFormValues {
  address: string;
  label: string;
  note: string;
}

const MAX_LENGTH_NOTE = 2048;
const MAX_LENGTH_LABEL = 256;

export function AddressForm({
  service,
  submit,
}: {
  service: iCloudService;
  submit: (address: string, metaData: MetaData) => Promise<void>;
}) {
  const [addressOption, setAddressOption] = useState<string | null>(null);
  const { pop } = useNavigation();
  const effectRan = useRef(false);

  async function generate() {
    try {
      const address = await service.hideMyEmail.generateAddress();
      setAddressOption(address);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Generating address failed",
        message: (error as { message: string }).message,
      });
    }
  }

  useEffect(() => {
    // For React Strict Mode, which mounts twice
    if (!effectRan.current) {
      effectRan.current = true;
      (async () => {
        await generate();
      })();
    }
  }, []);

  const { handleSubmit, itemProps } = useForm<AddressFormValues>({
    async onSubmit(values) {
      await submit(addressOption!, values);
      pop();
    },
    validation: {
      address: () => {
        if (!addressOption) return "Please wait until an address is generated";
      },
      label: (value) => {
        if (value && value.length > MAX_LENGTH_LABEL) {
          return `Max ${MAX_LENGTH_LABEL} characters`;
        } else if (!value?.trim()) {
          return "Label cannot be empty";
        }
      },
      note: (value) => {
        if (value && value.length > MAX_LENGTH_NOTE) {
          return `Max ${MAX_LENGTH_NOTE} characters`;
        }
      },
    },
  });

  return (
    <Form
      isLoading={!addressOption}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
          <Action
            title="Generate New Address"
            onAction={async () => {
              setAddressOption(null);
              await generate();
            }}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Address" text={addressOption ?? "Loading..."} />

      <Form.TextField title="Label" {...itemProps.label} />
      <Form.TextField title="Note" {...itemProps.note} />
    </Form>
  );
}
