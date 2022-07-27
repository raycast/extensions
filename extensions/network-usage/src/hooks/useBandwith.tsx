import { environment, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";

import { RealtimeBandwithData, getActiveInterface, getBandwidthOfToday, watchBandwidth } from "../lib/bandwith";
import { checkVNStatInstalled, checkVNStatServiceStarted, installVNStat, startVNStatService } from "../lib/cli";

const useBandwith = () => {
  const [bandwith, setBandwith] = useState<RealtimeBandwithData>();
  const [todaysBandwith, setTodaysBandwith] = useState<{
    tx: number;
    rx: number;
    lastUpdate: string;
  }>();
  const [isSetupCompleted, setIsSetupCompleted] = useState(false);

  useEffect(() => {
    const get = async () => {
      console.log("checking vnstat is installed");

      if (!checkVNStatInstalled()) {
        console.log("vnstat is installing");

        installVNStat();

        console.log("vnstat is installed");
      }

      console.log("checking vnstat service is started");

      if (!checkVNStatServiceStarted()) {
        console.log("vnstat service is starting");
        startVNStatService();
        console.log("vnstat service is started");
      }

      console.log("all dependecies are ready");

      setIsSetupCompleted(true);

      const activeInterface = getActiveInterface();

      watchBandwidth({
        networkInterface: activeInterface,
        onData: (data) => {
          if (environment.launchType === LaunchType.UserInitiated) {
            setBandwith(data);
          }
        },
        onError: () => {
          console.log("error");
        },
      });

      const bandwithOfToday = getBandwidthOfToday(activeInterface);

      setTodaysBandwith(bandwithOfToday);
    };

    get();
  }, []);

  return { bandwith, todaysBandwith, isSetupCompleted };
};

export default useBandwith;
