import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { APIError, requestDeal } from "../api";
import { DealDetailView } from "./DealDetailView";

interface Values {
  product_name: string;
  url: string;
}

export function DealRequestForm({ productName = "" }: { productName?: string }) {
  const { push, pop } = useNavigation();

  const { handleSubmit, itemProps, setValidationError } = useForm<Values>({
    initialValues: { product_name: productName, url: "" },
    validation: {
      product_name: (value) =>
        !value?.trim() ? "Required" : value.length > 100 ? "100 characters at most" : undefined,
      url: (value) => (value && value.length > 500 ? "500 characters at most" : undefined),
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Requesting deal…" });
      try {
        const request = await requestDeal({ product_name: values.product_name, url: values.url || undefined });
        toast.style = Toast.Style.Success;

        if (request.deal) {
          toast.title = `There's already a deal for ${request.deal.name}`;
          pop();
          push(<DealDetailView deal={request.deal} />);
        } else {
          toast.title = "Deal requested";
          toast.message =
            request.status === "watching"
              ? `No deal for ${request.product_name} right now. We'll email you when one lands.`
              : "We'll email you if we land this one.";
          pop();
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn't request deal";
        toast.message = error instanceof Error ? error.message : String(error);

        if (error instanceof APIError) {
          if (error.fields.product_name) setValidationError("product_name", error.fields.product_name.join(", "));
          if (error.fields.url) setValidationError("url", error.fields.url.join(", "));
        }
      }
    },
  });

  return (
    <Form
      navigationTitle="Request a Deal"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Request Deal" icon={Icon.Megaphone} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Tell us which product you'd like a deal on. We use requests to decide which companies to approach, and email you when a deal lands." />
      <Form.TextField title="Product" placeholder="Linear" {...itemProps.product_name} />
      <Form.TextField title="Website" placeholder="linear.app (optional)" {...itemProps.url} />
    </Form>
  );
}
