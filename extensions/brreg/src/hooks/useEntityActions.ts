import { showToast, Toast } from "@raycast/api";

export function useEntityActions() {
  const handleCopyOrgNumber = () => {
    showToast(Toast.Style.Success, "Organization number copied to clipboard");
  };

  const handleCopyAddress = () => {
    showToast(Toast.Style.Success, "Address copied to clipboard");
  };

  return {
    handleCopyOrgNumber,
    handleCopyAddress,
  };
}
