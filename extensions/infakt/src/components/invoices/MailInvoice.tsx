import { useState } from "react";

import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { MutatePromise, useForm } from "@raycast/utils";

import { ApiInvoice } from "@/api/invoice";
import { useClient } from "@/hooks/useClient";
import { InvoiceObject, SendViaMailPayload } from "@/types/invoice";
import { ApiPaginatedResponse } from "@/types/utils";
import { locales, printTypes } from "@/utils";

type Props = {
  invoice: InvoiceObject;
  mutateInvoices: MutatePromise<ApiPaginatedResponse<InvoiceObject[]> | undefined>;
};

export function MailInvoice({ invoice, mutateInvoices }: Props) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { clientData, clientIsLoading } = useClient({
    clientId: invoice?.client_id ?? 0,
    options: {
      execute: !!invoice?.client_id,
    },
  });

  const { handleSubmit, itemProps } = useForm<SendViaMailPayload>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending invoice via mail" });

      const payload: SendViaMailPayload = {
        print_type: values.print_type,
        locale: values.locale,
        recipient: values.recipient,
        send_copy: values.send_copy,
      };

      try {
        await mutateInvoices(ApiInvoice.sendMail(invoice.id, payload));

        toast.style = Toast.Style.Success;
        toast.title = "Successfully sent invoice 🎉";

        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to send invoice 😥";
        toast.message = error instanceof Error ? error.message : undefined;
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      print_type: "original",
      locale: "pl",
      recipient: clientData?.email ?? "",
      send_copy: true,
    },
    validation: {
      print_type: (value) => {
        if (!value || (value && !value.length)) {
          return "Print type is required";
        }
      },
      locale: (value) => {
        if (!value) {
          return "Locale is required";
        }
      },
      recipient: (value) => {
        if (!value) {
          return "Recipient is required";
        }
      },
    },
  });

  return (
    <Form
      isLoading={isLoading || clientIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Invoice Via Mail" icon={Icon.Envelope} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Print Type" {...itemProps.print_type}>
        {printTypes?.map((printType) => (
          <Form.Dropdown.Item key={printType.value} value={printType.value} title={printType.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Locale" {...itemProps.locale}>
        {locales?.map((locale) => <Form.Dropdown.Item key={locale.value} value={locale.value} title={locale.name} />)}
      </Form.Dropdown>

      <Form.TextField autoFocus title="Recipient" {...itemProps.recipient} />

      <Form.Checkbox label="Send Copy" {...itemProps.send_copy} />
    </Form>
  );
}
