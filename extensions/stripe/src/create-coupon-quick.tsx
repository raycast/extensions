import { LaunchProps, showToast, Toast, Clipboard, showHUD, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import Stripe from "stripe";
import { STRIPE_API_VERSION } from "@src/enums";

const { stripeTestApiKey, stripeLiveApiKey } = getPreferenceValues();

// Default to test mode for quick commands
const stripe = stripeTestApiKey
  ? new Stripe(stripeTestApiKey, { apiVersion: STRIPE_API_VERSION })
  : stripeLiveApiKey
    ? new Stripe(stripeLiveApiKey, { apiVersion: STRIPE_API_VERSION })
    : null;

/**
 * Arguments for the quick coupon creation command.
 */
interface QuickCouponArguments {
  percentage: string;
}

/**
 * Create Coupon Quick Command - Rapidly create percentage-based coupons from anywhere.
 *
 * This is a no-UI quicklink command that:
 * - Accepts a percentage argument (0-100)
 * - Generates a random 8-character coupon code
 * - Creates a "forever" duration coupon
 * - Automatically copies coupon ID to clipboard
 * - Shows success HUD notification
 * - Uses preference-based API keys (defaults to test mode)
 *
 * Usage: Invoke from Raycast, enter percentage, get instant coupon.
 * Perfect for rapid coupon generation during sales or customer support.
 */
export default async function CreateCouponQuick(props: LaunchProps<{ arguments: QuickCouponArguments }>) {
  const { percentage } = props.arguments;

  if (!stripe) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Stripe API key is not configured",
    });
    return;
  }

  // Validate percentage
  const percentOff = parseFloat(percentage);
  if (isNaN(percentOff) || percentOff <= 0 || percentOff > 100) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid percentage",
      message: "Please enter a number between 0 and 100",
    });
    return;
  }

  try {
    await closeMainWindow();
    await showHUD("Creating coupon...");

    // Generate random coupon ID (8 characters, uppercase alphanumeric)
    const randomId = Array.from({ length: 8 }, () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      return chars.charAt(Math.floor(Math.random() * chars.length));
    }).join("");

    // Create the coupon
    const coupon = await stripe.coupons.create({
      id: randomId,
      percent_off: percentOff,
      duration: "forever",
      name: `${percentOff}% Off Coupon`,
    });

    // Copy coupon ID to clipboard
    await Clipboard.copy(coupon.id);

    await showHUD(`✅ Coupon "${coupon.id}" created (${percentOff}% off) - Copied to clipboard!`);
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to create coupon",
    });
  }
}
