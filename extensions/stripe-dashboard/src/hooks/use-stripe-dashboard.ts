import { usePropsContext } from "./use-props-context";

const BASE_URL = "https://dashboard.stripe.com/";

type StripeDashboard = {
  dashboardUrl: string;
}

export const useStripeDashboard = (): StripeDashboard => {
  const { environment } = usePropsContext();

  const dashboardUrl = `${BASE_URL}${environment === "test" ? "test" : ""}`;
  return { dashboardUrl };
};
