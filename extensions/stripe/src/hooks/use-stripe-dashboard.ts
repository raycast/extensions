import { useEnvContext } from "./use-env-context";

const BASE_URL = "https://dashboard.stripe.com";

type StripeDashboard = {
  dashboardUrl: string;
};

export const useStripeDashboard = (): StripeDashboard => {
  const { environment } = useEnvContext();

  const dashboardUrl = `${BASE_URL}${environment === "test" ? "/test" : ""}`;
  return { dashboardUrl };
};
