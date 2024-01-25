import { Fragment, useRef, useState } from "react";

import { Action, ActionPanel, Form, Icon, LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { useForm } from "@raycast/utils";

import { ApiInvoice } from "@/api/invoice";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { CreateInvoiceFormValues, CreateInvoicePayload, Service } from "@/types/invoice";
import { CreateProductFormValues } from "@/types/product";
import { FormItemRef, paymentMethods } from "@/utils";
import { formatPrice } from "@/utils/formatters";

type Props = {
  draftValues?: CreateInvoiceFormValues;
};

export function CreateInvoice({ draftValues }: Props) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [products, setProducts] = useState<CreateProductFormValues[]>([
    {
      name: "",
      quantity: "",
      tax_symbol: "",
      net_price: "",
      unit: "",
    },
  ]);

  const productInputRefs = useRef<(FormItemRef | null)[]>([]);

  const { clientsData, clientsIsLoading } = useClients();
  const { productsData, productsIsLoading } = useProducts();
  const { bankAccountsData, bankAccountsIsLoading } = useBankAccounts();

  const { handleSubmit, itemProps, reset } = useForm<CreateInvoiceFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Adding invoice" });

      const services: Partial<Service>[] = products.map((product) => ({
        name: product.name,
        quantity: product.quantity ? Number(product.quantity) : 0,
        tax_symbol: product.tax_symbol,
        net_price: product.net_price ? Number(product.net_price) : 0,
        unit: product.unit,
      }));

      const payload: CreateInvoicePayload = {
        invoice: {
          payment_method: values.payment_method,
          bank_account: values.bank_account,
          client_id: values.client_id,
          services,
        },
      };

      try {
        const [invoice, error] = await ApiInvoice.create(payload);
        if (invoice) {
          toast.style = Toast.Style.Success;
          toast.title = "Successfully created invoice 🎉";
          reset({
            payment_method: "transfer",
            bank_account: "",
            client_id: "0",
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
      client_id: draftValues?.client_id ?? "",
      payment_method: draftValues?.payment_method ?? "transfer",
      bank_account: draftValues?.bank_account ?? "",
    },
    validation: {
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
              title="Create New Product"
              icon={Icon.NewDocument}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={async () => {
                await launchCommand({ name: "create_product", type: LaunchType.UserInitiated });
              }}
            />
            <Action
              title="Add Product"
              icon={Icon.PlusCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={async () => {
                setProducts((prev) => {
                  return [...prev, { name: "", quantity: "", tax_symbol: "", net_price: "", unit: "" }];
                });

                setTimeout(() => {
                  const inputRef = productInputRefs.current[products.length];
                  if (inputRef) {
                    inputRef.focus();
                  }
                });
              }}
            />
            <Action
              title="Remove Last Product"
              icon={Icon.MinusCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => {
                setProducts((prev) => {
                  if (prev.length === 1) return prev;
                  return prev.filter((_, index) => index !== prev.length - 1);
                });

                setTimeout(() => {
                  const inputRef = productInputRefs.current[products.length - 2];
                  if (inputRef) {
                    inputRef.focus();
                  }
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Bank Account" {...itemProps.bank_account}>
        {bankAccountsData?.map((bank) => (
          <Form.Dropdown.Item
            key={bank.id}
            value={bank.account_number}
            title={`${bank.bank_name} – ${bank.custom_name}`}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Payment Method" {...itemProps.payment_method}>
        {paymentMethods?.map((method) => (
          <Form.Dropdown.Item key={method.value} value={method.value} title={method.name} />
        ))}
      </Form.Dropdown>

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

      {products.map((product, index) => (
        <Fragment key={`product-${index}`}>
          <Form.Separator />

          <Form.Dropdown
            autoFocus={index === 0}
            id={`services-${index}`}
            title={`Product ${index + 1}`}
            error={product.name ? undefined : "Product is required"}
            info={product.name}
            ref={(ref) => {
              productInputRefs.current[index] = ref;
            }}
            value={product.name}
            onChange={(value) => {
              const newProducts = [...products];
              const product = productsData?.find((product) => product.name.toLowerCase() === value.toLowerCase());

              const newProduct: CreateProductFormValues = {
                name: product?.name ?? "",
                quantity: product?.quantity ? String(product?.quantity) : "",
                tax_symbol: product?.tax_symbol ?? "",
                net_price: product?.net_price ? String(product?.net_price) : "",
                unit: product?.unit ?? "",
              };

              newProducts[index] = newProduct;

              setProducts(newProducts);
            }}
          >
            <Form.Dropdown.Item value="" title="" />
            {productsData?.map((product) => (
              <Form.Dropdown.Item key={product.id} value={product.name} title={product.name} />
            ))}
          </Form.Dropdown>

          {product.net_price ? (
            <Form.TextField
              id={`net-price-${index}`}
              title="Net Price"
              value={product.net_price}
              onChange={(value) => {
                const newProducts = [...products];
                const newProduct = { ...newProducts[index], net_price: value };
                newProducts[index] = newProduct;
                setProducts(newProducts);
              }}
            />
          ) : null}

          {product.name ? (
            <Form.TextField
              id={`quantity-${index}`}
              title="Quantity"
              value={product.quantity}
              error={Number(product.quantity) > 0 ? undefined : "Quantity is required"}
              onChange={(value) => {
                const newProducts = [...products];
                const newProduct = { ...newProducts[index], quantity: value };
                newProducts[index] = newProduct;
                setProducts(newProducts);
              }}
            />
          ) : null}

          {product.net_price ? (
            <Form.Description
              title="Price"
              text={`Net - ${formatPrice(Number(product.net_price))}\nGross - ${formatPrice(
                Number(product.net_price) * ((Number(product.tax_symbol) + 100) / 100),
              )}\nUnit Net - ${formatPrice(Number(product.net_price) / Number(product.quantity))}`}
            />
          ) : null}
        </Fragment>
      ))}
    </Form>
  );
}
