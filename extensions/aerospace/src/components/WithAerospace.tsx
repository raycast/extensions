import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { resolveAerospaceBin } from "../utils/aerospace";
import { ErrorView } from "./ErrorView";

export function WithAerospace({ children }: { children: React.ReactNode }) {
  const { isLoading, error } = usePromise(resolveAerospaceBin);

  if (isLoading) return <Detail isLoading />;
  if (error) return <ErrorView error={error} />;

  return <>{children}</>;
}
