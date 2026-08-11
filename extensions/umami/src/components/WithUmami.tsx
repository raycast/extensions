import { Detail } from "@raycast/api";
import { FC, PropsWithChildren } from "react";
import { useValidatePreferences } from "../lib/umami";
import ErrorComponent from "./ErrorComponent";

const WithUmami: FC<PropsWithChildren<object>> = ({ children }) => {
  const { isLoading, error } = useValidatePreferences();

  if (isLoading) return <Detail isLoading />;

  if (error) {
    return <ErrorComponent error={error} />;
  }

  return <>{children}</>;
};
export default WithUmami;
