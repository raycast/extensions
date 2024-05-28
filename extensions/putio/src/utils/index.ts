import { useEffect, useState } from "react";
import { getApplications } from "@raycast/api";

export const useIsVlcInstalled = () => {
  const [isVlcInstalled, setIsVlcInstalled] = useState(false);

  useEffect(() => {
    const checkIfVlcInstalled = async () => {
      const applications = await getApplications();
      const vlcIsInstalled = applications.some(({ bundleId }) => bundleId === "org.videolan.vlc");

      setIsVlcInstalled(vlcIsInstalled);
    };

    checkIfVlcInstalled();
  }, []);

  return isVlcInstalled;
};
