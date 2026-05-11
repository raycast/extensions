import { useEffect, useState } from "react";

import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { MutatePromise, useForm } from "@raycast/utils";

import { ApiProduct } from "@/api/product";
import { useVatRates } from "@/hooks/useVatRates";
import { ProductObject, UpdateProductFormValues, UpdateProductPayload } from "@/types/product";
import { ApiPaginatedResponse } from "@/types/utils";

type Props = {
  product: ProductObject;
  mutateProducts: MutatePromise<ApiPaginatedResponse<ProductObject[]> | undefined>;
};

export function UpdateProduct({ product, mutateProducts }: Props) {
  const { pop } = useNavigation();

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
  } = useForm<UpdateProductFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating product" });

      const payload: UpdateProductPayload = {
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
        await mutateProducts(ApiProduct.update(product.id, payload));

        toast.style = Toast.Style.Success;
        toast.title = "Successfully updated product 🎉";

        reset({
          name: "",
          unit: "",
          quantity: "",
          net_price: "0",
          tax_symbol: "23",
        });

        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update product 😥";
        toast.message = error instanceof Error ? error.message : undefined;
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      name: product?.name ?? "",
      unit: product?.unit ?? "",
      quantity: product?.quantity ? String(product?.quantity) : "1",
      net_price: product?.net_price ? String(product.net_price / 100) : "0",
      tax_symbol: product?.tax_symbol ? String(product.tax_symbol) : "23",
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
      isLoading={isLoading || vatRatesIsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Product" icon={Icon.NewDocument} onSubmit={handleSubmit} />
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

      <Form.Description title="Vat Price" text={String(taxPrice)} />

      <Form.Description title="Gross Price" text={String(grossPrice)} />

      <Form.Description title="Unit Net Price" text={String(unitNetPrice)} />
    </Form>
  );
}
