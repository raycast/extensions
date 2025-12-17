import { Detail, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { FC, PropsWithChildren } from "react";
import { IS_CLOUD, umami } from "../lib/umami";
import ErrorComponent from "./ErrorComponent";
import { handleUmamiError } from "../lib/utils";

const WithUmami: FC<PropsWithChildren<object>> = ({ children }) => {
  const { UMAMI_API_CLIENT_USER_ID, UMAMI_API_CLIENT_SECRET, UMAMI_API_KEY } = getPreferenceValues<Preferences>();
  const { isLoading, error } = usePromise(
    async () => {
      if (IS_CLOUD) {
        if (!UMAMI_API_KEY) throw new Error("Missing Preference");
      } else {
        if (!UMAMI_API_CLIENT_USER_ID || !UMAMI_API_CLIENT_SECRET) throw new Error("Missing Preferences");
      }
      const { error } = await umami.getMe();
      handleUmamiError(error);
    },
    [],
    {
      failureToastOptions: {
        title: "Invalid Preference(s) detected.",
      },
    },
  );

  if (isLoading) return <Detail isLoading />;

  if (error) {
    return <ErrorComponent error={error} />;
  }

  return <>{children}</>;
};
export default WithUmami;
