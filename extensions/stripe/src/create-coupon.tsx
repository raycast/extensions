import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  popToRoot,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import Stripe from "stripe";
import { withEnvContext } from "./components";
import { useEnvContext } from "./hooks";
import { STRIPE_API_VERSION } from "./enums";

const { stripeTestApiKey, stripeLiveApiKey } = getPreferenceValues();

const stripeTest = stripeTestApiKey ? new Stripe(stripeTestApiKey, { apiVersion: STRIPE_API_VERSION }) : null;
const stripeLive = stripeLiveApiKey ? new Stripe(stripeLiveApiKey, { apiVersion: STRIPE_API_VERSION }) : null;

interface CouponFormValues {
  id: string;
  name: string;
  discountType: "percentage" | "fixed";
  percentOff?: string;
  amountOff?: string;
  currency?: string;
  duration: "forever" | "once" | "repeating";
  durationInMonths?: string;
  maxRedemptions?: string;
  redeemBy?: Date;
}

function CreateCouponForm() {
  const { environment } = useEnvContext();
  const stripe = environment === "test" ? stripeTest : stripeLive;

  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [duration, setDuration] = useState<"forever" | "once" | "repeating">("forever");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: CouponFormValues) => {
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
        title: "Creating coupon...",
      });

      // Build coupon params
      const couponParams: Stripe.CouponCreateParams = {
        id: values.id || undefined,
        name: values.name,
        duration: values.duration,
      };

      // Add discount amount based on type
      if (values.discountType === "percentage") {
        couponParams.percent_off = parseFloat(values.percentOff || "0");
      } else {
        couponParams.amount_off = Math.round(parseFloat(values.amountOff || "0") * 100);
        couponParams.currency = values.currency?.toLowerCase() || "usd";
      }

      // Add optional fields
      if (values.duration === "repeating" && values.durationInMonths) {
        couponParams.duration_in_months = parseInt(values.durationInMonths);
      }

      if (values.maxRedemptions) {
        couponParams.max_redemptions = parseInt(values.maxRedemptions);
      }

      if (values.redeemBy) {
        couponParams.redeem_by = Math.floor(values.redeemBy.getTime() / 1000);
      }

      const coupon = await stripe.coupons.create(couponParams);

      // Copy coupon ID to clipboard
      await Clipboard.copy(coupon.id);

      await showToast({
        style: Toast.Style.Success,
        title: "Coupon created!",
        message: `Coupon ID "${coupon.id}" copied to clipboard`,
      });

      await popToRoot();
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to create coupon",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Coupon" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a coupon for discounting charges" />

      <Form.TextField
        id="id"
        title="Coupon Code"
        placeholder="e.g., SUMMER2024 (optional - auto-generated if empty)"
        info="Unique identifier for the coupon (leave empty to auto-generate)"
      />

      <Form.TextField
        id="name"
        title="Coupon Name"
        placeholder="e.g., Summer Sale"
        info="Internal name for the coupon"
      />

      <Form.Separator />

      <Form.Dropdown id="discountType" title="Discount Type" value={discountType} onChange={setDiscountType as any}>
        <Form.Dropdown.Item value="percentage" title="Percentage Off" icon={Icon.Percent} />
        <Form.Dropdown.Item value="fixed" title="Fixed Amount Off" icon={Icon.Coins} />
      </Form.Dropdown>

      {discountType === "percentage" ? (
        <Form.TextField
          id="percentOff"
          title="Percent Off"
          placeholder="e.g., 25"
          info="Discount percentage (0-100)"
        />
      ) : (
        <>
          <Form.TextField
            id="amountOff"
            title="Amount Off"
            placeholder="e.g., 10.00"
            info="Fixed discount amount"
          />
          <Form.TextField id="currency" title="Currency" placeholder="USD" defaultValue="USD" />
        </>
      )}

      <Form.Separator />

      <Form.Dropdown id="duration" title="Duration" value={duration} onChange={setDuration as any}>
        <Form.Dropdown.Item value="forever" title="Forever" icon={Icon.Infinity} />
        <Form.Dropdown.Item value="once" title="Once" icon={Icon.Circle} />
        <Form.Dropdown.Item value="repeating" title="Repeating" icon={Icon.Repeat} />
      </Form.Dropdown>

      {duration === "repeating" && (
        <Form.TextField
          id="durationInMonths"
          title="Duration (Months)"
          placeholder="e.g., 3"
          info="Number of months the coupon applies"
        />
      )}

      <Form.Separator />

      <Form.TextField
        id="maxRedemptions"
        title="Max Redemptions"
        placeholder="e.g., 100 (optional)"
        info="Maximum number of times this coupon can be redeemed"
      />

      <Form.DatePicker
        id="redeemBy"
        title="Expiration Date"
        info="Optional expiration date for the coupon"
        type={Form.DatePicker.Type.Date}
      />
    </Form>
  );
}

export default withEnvContext(CreateCouponForm);

