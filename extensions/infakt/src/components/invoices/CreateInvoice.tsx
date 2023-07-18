import { Action, ActionPanel, Form, Icon, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { ApiInvoice } from "../../api/invoice";
import useBankAccounts from "../../hooks/useBankAccounts";
import useClients from "../../hooks/useClients";
import useProducts from "../../hooks/useProducts";
import { CreateInvoiceFormValues, CreateInvoicePayload } from "../../types/invoice";
import { paymentMethods } from "../../utils";
import { formatPrice } from "../../utils/formatters";

type Props = {
  draftValues?: CreateInvoiceFormValues;
};

export default function CreateInvoice({ draftValues }: Props) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { clientsData, clientsIsLoading } = useClients();
  const { productsData, productsIsLoading } = useProducts();
  const { bankAccountsData, bankAccountsIsLoading } = useBankAccounts();

  const { handleSubmit, itemProps, reset } = useForm<CreateInvoiceFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Adding invoice" });

      const payload: CreateInvoicePayload = {
        invoice: {
          payment_method: values.payment_method,
          bank_account: values.bank_account,
          client_id: values.client_id,
          services: [],
        },
      };

      if (values.services?.length) {
        values.services.forEach((serviceId) => {
          const product = productsData?.find((product) => product.id === Number(serviceId));
          if (!product) return;
          payload.invoice.services.push({
            name: product.name,
            quantity: product.quantity,
            tax_symbol: product.tax_symbol,
            gross_price: product.gross_price,
            unit: product.unit,
          });
        });
      }

      try {
        const [invoice, error] = await ApiInvoice.create(payload);

        if (invoice) {
          toast.style = Toast.Style.Success;
          toast.title = "Successfully created invoice 🎉";

          reset({
            payment_method: "transfer",
            bank_account: "",
            client_id: "0",
            services: [],
          });

          await launchCommand({ name: "search_invoices", type: LaunchType.UserInitiated });
        }

        if (error) throw new Error(error);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create invoice 😥";
        toast.message = error instanceof Error ? error.message : undefined;
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      services: draftValues?.services?.length ? draftValues.services : [],
      client_id: draftValues?.client_id ?? "",
      payment_method: draftValues?.payment_method ?? "transfer",
      bank_account: draftValues?.bank_account ?? "",
    },
    validation: {
      services: (value) => {
        if (!value || (value && !value.length)) {
          return "Products are required";
        }
      },
      client_id: (value) => {
        if (!value) {
          return "Client is required";
        }
      },
      payment_method: (value) => {
        if (!value) {
          return "Payment method is required";
        }
      },
      bank_account: (value) => {
        if (!value) {
          return "Bank account is required";
        }
      },
    },
  });

  return (
    <Form
      enableDrafts
      isLoading={isLoading || productsIsLoading || clientsIsLoading || bankAccountsIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Invoice" icon={Icon.NewDocument} onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action
              title="Create Product"
              icon={Icon.NewDocument}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={async () => {
                await launchCommand({ name: "create_product", type: LaunchType.UserInitiated });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TagPicker title="Products" {...itemProps.services}>
        {productsData?.map((product) => (
          <Form.TagPicker.Item
            key={product.id}
            value={String(product.id)}
            title={`${product.name} [${formatPrice(product?.gross_price ?? 0)}]`}
          />
        ))}
      </Form.TagPicker>

      <Form.Dropdown title="Client" {...itemProps.client_id}>
        {clientsData?.map((client) => (
          <Form.Dropdown.Item
            key={client.id}
            value={String(client.id)}
            title={
              client?.company_name
                ? `${client.company_name} [${client.nip}]`
                : `${client?.first_name} ${client?.last_name}`
            }
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Payment Method" {...itemProps.payment_method}>
        {paymentMethods?.map((method) => (
          <Form.Dropdown.Item key={method.value} value={method.value} title={method.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Bank Account" {...itemProps.bank_account}>
        {bankAccountsData?.map((bank) => (
          <Form.Dropdown.Item
            key={bank.id}
            value={bank.account_number}
            title={`${bank.bank_name} – ${bank.custom_name}`}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
