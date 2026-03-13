import type { FC, PropsWithChildren } from "react";
import isValidToken from "../utils/is-valid-token";
import InvalidTokenView from "./details/invalid-token-view";
import { usePromise } from "@raycast/utils";
import { Detail } from "@raycast/api";

const WithValidToken: FC<PropsWithChildren<object>> = ({ children }) => {
  const { isLoading, error } = usePromise(isValidToken, [], {
    failureToastOptions: {
      title: "Invalid token detected. Please set one in the settings.",
    },
  });

  if (isLoading) return <Detail isLoading />;

  if (error) {
    return <InvalidTokenView />;
  }

  return <>{children}</>;
};

export default WithValidToken;
