import { useProfileContext } from "@src/hooks/use-profile-context";

const BASE_URL = "https://dashboard.stripe.com";

type StripeDashboard = {
  dashboardUrl: string;
};

export const useStripeDashboard = (): StripeDashboard => {
  const { activeEnvironment } = useProfileContext();

  const dashboardUrl = `${BASE_URL}${activeEnvironment === "test" ? "/test" : ""}`;
  return { dashboardUrl };
};
