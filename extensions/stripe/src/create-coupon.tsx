import { Form, ActionPanel, Action, Clipboard, popToRoot, Icon } from "@raycast/api";
import { useState } from "react";
import type Stripe from "stripe";
import { withProfileContext } from "@src/components";
import { useStripeClient } from "@src/hooks";
import { showOperationToast, handleStripeError } from "@src/utils";

/**
 * Form values for creating a new Stripe coupon.
 */
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

/**
 * Create Coupon Form - Interactive form to create discount coupons.
 *
 * Features:
 * - Percentage-based or fixed-amount discounts
 * - Duration options: forever, once, or repeating (with month count)
 * - Optional redemption limits and expiration dates
 * - Custom or auto-generated coupon codes
 * - Automatically copies coupon ID to clipboard on creation
 *
 * Useful for quickly creating promotional codes for customers.
 */
function CreateCouponForm() {
  const stripe = useStripeClient();
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [duration, setDuration] = useState<"forever" | "once" | "repeating">("forever");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: CouponFormValues) => {
    if (!stripe) {
      return;
    }

    setIsLoading(true);

    try {
      const coupon = await showOperationToast(
        "Creating coupon",
        async () => {
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

          return await stripe.coupons.create(couponParams);
        },
        `Coupon created! ID "${values.id || "auto-generated"}" copied to clipboard`,
      );

      // Copy coupon ID to clipboard
      await Clipboard.copy(coupon.id);

      await popToRoot();
    } catch (error) {
      await handleStripeError(error, "create coupon");
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

      <Form.Dropdown
        id="discountType"
        title="Discount Type"
        value={discountType}
        onChange={(value) => setDiscountType(value as "percentage" | "fixed")}
      >
        <Form.Dropdown.Item value="percentage" title="Percentage Off" icon={Icon.TwoArrowsClockwise} />
        <Form.Dropdown.Item value="fixed" title="Fixed Amount Off" icon={Icon.Coins} />
      </Form.Dropdown>

      {discountType === "percentage" ? (
        <Form.TextField id="percentOff" title="Percent Off" placeholder="e.g., 25" info="Discount percentage (0-100)" />
      ) : (
        <>
          <Form.TextField id="amountOff" title="Amount Off" placeholder="e.g., 10.00" info="Fixed discount amount" />
          <Form.TextField id="currency" title="Currency" placeholder="USD" defaultValue="USD" />
        </>
      )}

      <Form.Separator />

      <Form.Dropdown
        id="duration"
        title="Duration"
        value={duration}
        onChange={(value) => setDuration(value as "forever" | "once" | "repeating")}
      >
        <Form.Dropdown.Item value="forever" title="Forever" icon={Icon.Star} />
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

export default withProfileContext(CreateCouponForm);
