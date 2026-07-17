import useSWR from "swr";
import { appInstalled, appNotInstallAlertDialog } from "@/lib/utils";

const useIsInstalled = () => {
  const { data: isAppInstalled } = useSWR("appInstalled", async () => {
    const installed = await appInstalled();

    if (!installed) {
      await appNotInstallAlertDialog();
    }

    return installed;
  });

  return isAppInstalled;
};

export default useIsInstalled;
