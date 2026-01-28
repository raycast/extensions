import { Toast, showToast } from "@raycast/api";
import { useValidation } from "../hooks/use-validation";
import { InvalidCredentials } from "./InvalidCredentials";

export function Validation({ children }: { children: React.ReactNode }) {
  const { hasError, isLoading } = useValidation();

  if (hasError && !isLoading) {
    showToast(Toast.Style.Failure, "Error", "Failed to validate credentials");
    return <InvalidCredentials />;
  }

  return children;
}
