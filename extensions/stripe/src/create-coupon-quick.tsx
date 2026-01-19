import { LaunchProps, showToast, Toast, Clipboard, showHUD, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import Stripe from "stripe";
import { getActiveProfileConfig } from "@src/utils/profile-storage";
import { STRIPE_API_VERSION } from "@src/enums";

interface QuickCouponArguments {
  percentage: string;
}

const generateCouponCode = () =>
  Array.from({ length: 8 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]).join("");

export default async function CreateCouponQuick(props: LaunchProps<{ arguments: QuickCouponArguments }>) {
  const { percentage } = props.arguments;

  try {
    const { activeProfile, activeEnvironment } = await getActiveProfileConfig();

    if (!activeProfile) {
      return showToast({
        style: Toast.Style.Failure,
        title: "No Stripe Account",
        message: "Configure API keys in settings",
      });
    }

    const { effectiveEnvironment, apiKey } = (() => {
      const hasLive = !!activeProfile.liveApiKey;
      const hasTest = !!activeProfile.testApiKey;
      const env = !hasLive && hasTest ? "test" : hasLive && !hasTest ? "live" : activeEnvironment;
      return {
        effectiveEnvironment: env,
        apiKey: env === "test" ? activeProfile.testApiKey : activeProfile.liveApiKey,
      };
    })();

    if (!apiKey) {
      return showToast({
        style: Toast.Style.Failure,
        title: `${effectiveEnvironment === "test" ? "Test" : "Live"} Mode Key Missing`,
        message: `Add your API key for ${activeProfile.name}`,
      });
    }

    const percentOff = parseFloat(percentage);
    if (isNaN(percentOff) || percentOff <= 0 || percentOff > 100) {
      return showToast({
        style: Toast.Style.Failure,
        title: "Invalid Percentage",
        message: "Enter a number between 1 and 100",
      });
    }

    await closeMainWindow();
    await showHUD("Creating your coupon...");

    const coupon = await new Stripe(apiKey, { apiVersion: STRIPE_API_VERSION }).coupons.create({
      id: generateCouponCode(),
      percent_off: percentOff,
      duration: "forever",
      name: `${percentOff}% Off Coupon`,
    });

    await Clipboard.copy(coupon.id);
    await showHUD(
      `${effectiveEnvironment === "test" ? "🧪 Test Mode" : "✅"} ${percentOff}% off coupon created! Code: ${coupon.id}`,
    );
  } catch (error) {
    await showFailureToast(error, { title: "Coupon Creation Failed" });
  }
}
