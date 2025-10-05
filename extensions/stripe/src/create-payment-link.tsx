import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  open,
  getPreferenceValues,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import Stripe from "stripe";
import { withEnvContext, ListContainer } from "./components";
import { useEnvContext, useStripeDashboard } from "./hooks";
import { STRIPE_API_VERSION } from "./enums";
import { titleCase } from "./utils";

const { stripeTestApiKey, stripeLiveApiKey } = getPreferenceValues();

const stripeTest = stripeTestApiKey ? new Stripe(stripeTestApiKey, { apiVersion: STRIPE_API_VERSION }) : null;
const stripeLive = stripeLiveApiKey ? new Stripe(stripeLiveApiKey, { apiVersion: STRIPE_API_VERSION }) : null;

interface PaymentLinkFormValues {
  quantity?: string;
  allowPromotionCodes: boolean;
  afterCompletionType: "redirect" | "hosted_confirmation";
  redirectUrl?: string;
  customMessage?: string;
}

function CreatePaymentLinkForm({ product, price }: { product: Stripe.Product; price: Stripe.Price }) {
  const { environment } = useEnvContext();
  const stripe = environment === "test" ? stripeTest : stripeLive;
  const [isLoading, setIsLoading] = useState(false);
  const [afterCompletionType, setAfterCompletionType] = useState<"redirect" | "hosted_confirmation">(
    "hosted_confirmation",
  );

  const handleSubmit = async (values: PaymentLinkFormValues) => {
    if (!stripe) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Stripe ${environment} API key is not configured`,
      });
      return;
    }

    setIsLoading(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating payment link...",
      });

      // Build payment link params
      const params: Stripe.PaymentLinkCreateParams = {
        line_items: [
          {
            price: price.id,
            quantity: parseInt(values.quantity || "1"),
          },
        ],
        allow_promotion_codes: values.allowPromotionCodes,
      };

      // Configure after completion behavior
      if (values.afterCompletionType === "redirect" && values.redirectUrl) {
        params.after_completion = {
          type: "redirect",
          redirect: { url: values.redirectUrl },
        };
      } else {
        params.after_completion = {
          type: "hosted_confirmation",
          hosted_confirmation: values.customMessage
            ? { custom_message: values.customMessage }
            : undefined,
        };
      }

      const paymentLink = await stripe.paymentLinks.create(params);

      // Copy URL to clipboard
      await Clipboard.copy(paymentLink.url);

      await showToast({
        style: Toast.Style.Success,
        title: "Payment link created!",
        message: "URL copied to clipboard",
        primaryAction: {
          title: "Open Link",
          onAction: () => open(paymentLink.url),
        },
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to create payment link",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const priceAmount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : "0.00";
  const currency = price.currency?.toUpperCase() || "USD";
  const interval = price.recurring?.interval ? ` / ${price.recurring.interval}` : "";

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Create Payment Link - ${product.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Payment Link" icon={Icon.Link} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Product: ${product.name}`} />
      <Form.Description text={`Price: ${currency} ${priceAmount}${interval}`} />

      <Form.Separator />

      <Form.TextField
        id="quantity"
        title="Quantity"
        placeholder="1"
        defaultValue="1"
        info="Default quantity for this product"
      />

      <Form.Checkbox
        id="allowPromotionCodes"
        label="Allow Promotion Codes"
        defaultValue={true}
        info="Let customers enter coupon codes"
      />

      <Form.Separator />

      <Form.Dropdown
        id="afterCompletionType"
        title="After Purchase"
        value={afterCompletionType}
        onChange={setAfterCompletionType as any}
      >
        <Form.Dropdown.Item value="hosted_confirmation" title="Stripe Confirmation Page" icon={Icon.CheckCircle} />
        <Form.Dropdown.Item value="redirect" title="Redirect to URL" icon={Icon.Link} />
      </Form.Dropdown>

      {afterCompletionType === "redirect" ? (
        <Form.TextField
          id="redirectUrl"
          title="Redirect URL"
          placeholder="https://example.com/success"
          info="URL to redirect customers after successful payment"
        />
      ) : (
        <Form.TextArea
          id="customMessage"
          title="Custom Message"
          placeholder="Thank you for your purchase! (optional)"
          info="Optional custom message on the confirmation page"
        />
      )}
    </Form>
  );
}

function ProductListItem({
  product,
  prices,
  onSelectPrice,
}: {
  product: Stripe.Product;
  prices: Stripe.Price[];
  onSelectPrice: (product: Stripe.Product, price: Stripe.Price) => void;
}) {
  const defaultPrice = prices[0];
  const priceAmount = defaultPrice?.unit_amount ? (defaultPrice.unit_amount / 100).toFixed(2) : "N/A";
  const currency = defaultPrice?.currency?.toUpperCase() || "";

  return (
    <List.Item
      key={product.id}
      title={product.name || "Unnamed Product"}
      subtitle={defaultPrice ? `${currency} ${priceAmount}` : "No prices"}
      icon={{ source: Icon.Box, tintColor: "#635bff" }}
      accessories={[
        { text: product.active ? "Active" : "Inactive" },
        { text: `${prices.length} price${prices.length !== 1 ? "s" : ""}` },
      ]}
      actions={
        <ActionPanel>
          {prices.length > 0 && (
            <>
              <Action
                title="Create Payment Link with Default Price"
                icon={Icon.Link}
                onAction={() => onSelectPrice(product, defaultPrice)}
              />
              {prices.length > 1 && (
                <ActionPanel.Section title="All Prices">
                  {prices.map((price, idx) => {
                    const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : "0.00";
                    const curr = price.currency?.toUpperCase() || "USD";
                    const interval = price.recurring?.interval ? ` / ${price.recurring.interval}` : "";
                    return (
                      <Action
                        key={price.id}
                        title={`Use Price: ${curr} ${amount}${interval}`}
                        icon={Icon.Coins}
                        onAction={() => onSelectPrice(product, price)}
                      />
                    );
                  })}
                </ActionPanel.Section>
              )}
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

function ProductSelector() {
  const { environment } = useEnvContext();
  const { dashboardUrl } = useStripeDashboard();
  const stripe = environment === "test" ? stripeTest : stripeLive;
  const { push } = useNavigation();

  const { isLoading, data } = useCachedPromise(
    async () => {
      if (!stripe) {
        throw new Error(`Stripe ${environment} API key is not configured`);
      }

      // Fetch active products
      const products = await stripe.products.list({
        active: true,
        limit: 100,
      });

      // Fetch prices for each product
      const productsWithPrices = await Promise.all(
        products.data.map(async (product) => {
          const prices = await stripe.prices.list({
            product: product.id,
            active: true,
            limit: 10,
          });
          return { product, prices: prices.data };
        }),
      );

      return productsWithPrices;
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  const handleSelectPrice = (product: Stripe.Product, price: Stripe.Price) => {
    push(<CreatePaymentLinkFormWrapped product={product} price={price} />);
  };

  // Group by product type if available
  const productsData = data || [];

  return (
    <ListContainer isLoading={isLoading} searchBarPlaceholder="Search products...">
      {productsData.length === 0 ? (
        <List.EmptyView
          title="No Active Products"
          description="Create a product in Stripe Dashboard first"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Create Product" url={`${dashboardUrl}/products/create`} icon={Icon.Plus} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Products (${productsData.length})`}>
          {productsData.map(({ product, prices }) => (
            <ProductListItem key={product.id} product={product} prices={prices} onSelectPrice={handleSelectPrice} />
          ))}
        </List.Section>
      )}
    </ListContainer>
  );
}

const CreatePaymentLinkFormWrapped = withEnvContext(CreatePaymentLinkForm);

export default withEnvContext(ProductSelector);

