import { showToast, Toast, open, LaunchProps } from "@raycast/api";
import { fetchItemInputSelectedFirst } from "./utils/input-item-utils";
import { isValidPhoneNumber, cleanPhoneNumber } from "./utils/phone-number-utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.QuickCall }>) {
  const { number: argumentNumber } = props.arguments;
  const phoneNumber = argumentNumber || (await fetchItemInputSelectedFirst());
  if (phoneNumber) {
    handlePhoneNumber(phoneNumber);
    return null;
  }

  async function handlePhoneNumber(phoneNumber: string) {
    if (!isValidPhoneNumber(phoneNumber)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid phone number",
        message: "Please enter a valid phone number.",
      });
      return;
    }

    const cleanedNumber = cleanPhoneNumber(phoneNumber);

    try {
      await open(`tel://${cleanedNumber}`);
      await showToast({
        style: Toast.Style.Success,
        title: "Initiating call",
        message: `Calling ${cleanedNumber}...`,
      });
    } catch (error) {
      console.error("Error initiating call:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to initiate call",
        message: "Please try again or check your system settings.",
      });
    }
  }
}
