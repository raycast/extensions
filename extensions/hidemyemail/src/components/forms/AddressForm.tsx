import { Form, Action, ActionPanel, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { iCloudService } from "../../api/connect";
import { MetaData } from "../../api/hide-my-email";
import { iCloudSessionExpiredError } from "../../api/errors";
import { Login } from "../Login";

export interface AddressFormValues {
  address: string;
  label: string;
  note: string;
}

const MAX_LENGTH_NOTE = 2048;
const MAX_LENGTH_LABEL = 256;

export function AddressForm({
  initialValues,
  service,
  setService,
  submit,
}: {
  initialValues: AddressFormValues;
  service: iCloudService;
  setService: React.Dispatch<React.SetStateAction<iCloudService | null>>;
  submit: ((values: MetaData) => Promise<void>) | ((values: AddressFormValues) => Promise<void>);
}) {
  const [addressOption, setAddressOption] = useState<string | null>(null);
  const [showLoginAction, setShowLoginAction] = useState<boolean>(false);
  const { pop } = useNavigation();
  const effectRan = useRef(false);

  async function generate() {
    if (service) {
      try {
        const address = await service.hideMyEmail.generateAddress();
        setAddressOption(address);
        setValidationError("address", null);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Generating address failed",
          message: (error as { message: string }).message,
        });
        if (error instanceof iCloudSessionExpiredError) {
          setShowLoginAction(true);
        }
      }
    }
  }

  useEffect(() => {
    // For React Strict Mode, which mounts twice
    if (!effectRan.current && !initialValues.address && service) {
      effectRan.current = true;
      (async () => {
        await generate();
      })();
    }
  }, [service]);

  const { handleSubmit, itemProps, setValidationError } = useForm<AddressFormValues>({
    async onSubmit(values) {
      if (values.label == initialValues.label && values.note == initialValues.note) {
        // Nothing changed
        pop();
        return;
      }

      if (initialValues.address) {
        submit(values);
      } else {
        await submit({ ...values, address: addressOption! });
      }
      pop();
    },
    initialValues,
    validation: {
      address: () => {
        if (!initialValues.address && !addressOption) {
          return "Please wait until an address is generated";
        }
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
      isLoading={!initialValues.address && !addressOption && !showLoginAction}
      actions={
        <ActionPanel>
          {showLoginAction ? (
            <Action.Push
              title={"Log In"}
              target={
                <Login
                  onLogin={(iService: iCloudService) => {
                    setService(iService);
                    setShowLoginAction(false);
                    effectRan.current = false;
                    pop();
                  }}
                />
              }
              icon={{ source: Icon.Person, tintColor: "#4798FF" }}
            />
          ) : (
            <>
              <Action.SubmitForm title="Save" onSubmit={handleSubmit} icon={Icon.Stars} />
              {addressOption && (
                <Action
                  title="Generate New Address"
                  onAction={async () => {
                    setAddressOption(null);
                    await generate();
                    setValidationError("address", null);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  icon={Icon.Repeat}
                />
              )}
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Address"
        text={showLoginAction ? "Please log in" : initialValues.address || (addressOption ?? "Loading...")}
      />

      <Form.TextField title="Label" {...itemProps.label} error={itemProps.label.error || itemProps.address.error} />
      <Form.TextField title="Note" {...itemProps.note} />
    </Form>
  );
}
