import { useEffect, useState } from "react";

import { Action, ActionPanel, Form, Icon, LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { useForm } from "@raycast/utils";

import { ApiProduct } from "@/api/product";
import { useVatRates } from "@/hooks/useVatRates";
import { CreateProductFormValues, CreateProductPayload } from "@/types/product";
import { formatPrice } from "@/utils/formatters";

type Props = {
  draftValues?: CreateProductFormValues;
};

export function CreateProduct({ draftValues }: Props) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [taxPrice, setTaxPrice] = useState("0");
  const [grossPrice, setGrossPrice] = useState("0");
  const [unitNetPrice, setUnitNetPrice] = useState("0");

  const { vatRatesData, vatRatesIsLoading } = useVatRates();

  const {
    handleSubmit,
    itemProps,
    reset,
    values: { net_price, tax_symbol, quantity },
  } = useForm<CreateProductFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Adding product" });

      const payload: CreateProductPayload = {
        product: {
          name: values.name,
          unit: values.unit,
          quantity: values.quantity,
          net_price: Number(values.net_price) * 100,
          unit_net_price: Number(unitNetPrice) * 100,
          tax_price: Number(taxPrice) * 100,
          gross_price: Number(grossPrice) * 100,
          tax_symbol: values.tax_symbol,
        },
      };

      try {
        const [product, error] = await ApiProduct.create(payload);

        if (product) {
          toast.style = Toast.Style.Success;
          toast.title = "Successfully created product 🎉";

          reset({
            name: "",
            unit: "",
            quantity: "",
            net_price: "0",
            tax_symbol: "23",
          });

          await launchCommand({ name: "search_products", type: LaunchType.UserInitiated });
        }

        if (error) throw new Error(error);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create product 😥";
        toast.message = error instanceof Error ? error.message : undefined;
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      name: draftValues?.name ?? "",
      unit: draftValues?.unit ?? "",
      quantity: draftValues?.quantity ?? "1",
      net_price: draftValues?.net_price ? String(draftValues.net_price) : "0",
      tax_symbol: draftValues?.tax_symbol ? String(draftValues.tax_symbol) : "23",
    },
    validation: {
      name: (value) => {
        if (!value) {
          return "Name is required";
        }
      },
      quantity: (value) => {
        if (!value) {
          return "Quantity is required";
        } else if (value && /(^[^0-9]+)/.test(value)) {
          return "Quantity must be a number";
        } else if (value && Number(value) <= 0) {
          return "Quantity must be greater than 0";
        }
      },
      net_price: (value) => {
        if (!value) {
          return "Net price is required";
        } else if (value && /(^[^0-9]+)/.test(value)) {
          return "Net price must be a number";
        } else if (value && Number(value) < 0) {
          return "Net price must be greater or equal 0";
        }
      },
      tax_symbol: (value) => {
        if (!value) {
          return "Tax symbol is required";
        }
      },
    },
  });

  useEffect(() => {
    const netNumber = Number(net_price);
    const taxNumber = (Number(tax_symbol) || 0) / 100;
    const quantityNumber = Number(quantity);

    const grossPrice = netNumber * (1 + taxNumber);
    const taxPrice = grossPrice - netNumber;
    const unitNetPrice = netNumber / quantityNumber;

    setGrossPrice(grossPrice.toFixed(2));
    setTaxPrice(taxPrice.toFixed(2));
    setUnitNetPrice(unitNetPrice.toFixed(2));
  }, [net_price, tax_symbol, quantity]);

  return (
    <Form
      enableDrafts
      isLoading={isLoading || vatRatesIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Product" icon={Icon.NewDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField autoFocus title="Name" placeholder="Enter name of product" {...itemProps.name} />

      <Form.TextField title="Unit" placeholder="Enter the unit of product" {...itemProps.unit} />

      <Form.TextField title="Quantity" placeholder="Enter the quantity of product" {...itemProps.quantity} />

      <Form.Dropdown title="Tax Symbol" {...itemProps.tax_symbol}>
        {vatRatesData?.map((vat) => <Form.Dropdown.Item key={vat.id} value={vat.symbol} title={vat.name} />)}
      </Form.Dropdown>

      <Form.TextField title="Net Price" placeholder="Enter the net price of product" {...itemProps.net_price} />

      <Form.Separator />

      <Form.Description title="Vat Price" text={formatPrice(Number(taxPrice) * 100)} />

      <Form.Description title="Gross Price" text={formatPrice(Number(grossPrice) * 100)} />

      <Form.Description title="Unit Net Price" text={formatPrice(Number(unitNetPrice) * 100)} />
    </Form>
  );
}
