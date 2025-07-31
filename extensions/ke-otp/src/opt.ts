import { showToast, Toast, Clipboard, getPreferenceValues, showHUD, LocalStorage } from "@raycast/api";
import { generateTOTP, parseOtpAuthUrl, getRemainingTime } from "./otp-utils";

interface Preferences {
  otpAuthUrl: string;
  prefix: string;
}

interface StoredSettings {
  otpAuthUrl: string;
  prefix: string;
}

export default async function GenerateOTP() {
  try {
    // Try to load from LocalStorage first, fallback to preferences
    let otpAuthUrl = "";
    let prefix = "";

    try {
      const stored = await LocalStorage.getItem<string>("otp-settings");
      if (stored) {
        const settings: StoredSettings = JSON.parse(stored);
        otpAuthUrl = settings.otpAuthUrl;
        prefix = settings.prefix || "";
      } else {
        // Fallback to preferences
        const preferences = getPreferenceValues<Preferences>();
        otpAuthUrl = preferences.otpAuthUrl;
        prefix = preferences.prefix || "";
      }
    } catch {
      // Fallback to preferences on error
      const preferences = getPreferenceValues<Preferences>();
      otpAuthUrl = preferences.otpAuthUrl;
      prefix = preferences.prefix || "";
    }

    if (!otpAuthUrl) {
      await showToast({
        style: Toast.Style.Failure,
        title: "🔐 OTP Not Configured",
        message: "Please open 'Otp Settings' to configure your OTP URL first",
      });
      return;
    }

    const config = parseOtpAuthUrl(otpAuthUrl);
    const otpCode = generateTOTP(config);
    const remainingTime = getRemainingTime(config.period);

    const fullCode = prefix + otpCode;

    await Clipboard.copy(fullCode);
    await Clipboard.paste(fullCode);

    await showHUD(`🔑 ${otpCode} (${remainingTime}s remaining)`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "❌ OTP Generation Failed",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
