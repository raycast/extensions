import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { getApplications, open } from "@raycast/api";

export const getAuthToken = () => {
  const { token } = getPreferenceValues<{ token: string }>();
  return token;
};

export const useVLC = () => {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const checkIfVlcInstalled = async () => {
      const applications = await getApplications();
      setInstalled(applications.some(({ bundleId }) => bundleId === "org.videolan.vlc"));
    };

    checkIfVlcInstalled();
  }, []);

  return {
    isInstalled: installed,
    open: (url: string) => open(url, "org.videolan.vlc"),
  };
};
