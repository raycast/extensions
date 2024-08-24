import { getArguments, getIPV4Address, getIPV6Address, isEmpty } from "./utils/common-utils";
import {
  captureException,
  Clipboard,
  closeMainWindow,
  environment,
  LaunchProps,
  LaunchType,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { publicIpv4, publicIpv6 } from "public-ip";
import { CopyIpArguments, IpType, IpVersion } from "./types/preferences";

export default async (props: LaunchProps<{ arguments: CopyIpArguments }>) => {
  const { args } = getArguments([props.arguments.ipType, props.arguments.ipVersion], ["ipType", "IpVersion"]);
  const ipTypeString = args[0] === IpType.PUBLIC ? IpType.PUBLIC : IpType.LOCAL;
  const ipVersionString = args[1] === IpVersion.IPV6 ? IpVersion.IPV6 : IpVersion.IPV4;

  try {
    if (environment.launchType === LaunchType.UserInitiated) {
      await closeMainWindow();
    }
    let ip = "";
    if (ipTypeString === IpType.LOCAL) {
      let ip_;
      if (ipVersionString === IpVersion.IPV4) {
        ip_ = getIPV4Address();
      } else {
        ip_ = getIPV6Address();
      }
      ip = ip_ ? ip_ : "";
    } else {
      let ip_;
      if (ipVersionString === IpVersion.IPV4) {
        ip_ = await publicIpv4({ onlyHttps: true })
          .then((ip) => ip)
          .catch(() => "");
      } else {
        ip_ = await publicIpv6({ onlyHttps: true })
          .then((ip) => ip)
          .catch(() => "");
      }
      ip = ip_ ? ip_ : "";
    }

    if (environment.launchType === LaunchType.UserInitiated) {
      if (!isEmpty(ip)) {
        await Clipboard.copy(`${ip}`);
        await showHUD(`🅿️ ${ipTypeString} ${ipVersionString} ${ip}`);
      } else {
        await showHUD(`🚨 Failed to get ${ipTypeString} ${ipVersionString} `);
      }
    }

    if (ip) {
      await updateCommandMetadata({ subtitle: ` ${ipTypeString} ${ipVersionString} ${ip}` });
    } else {
      await updateCommandMetadata({ subtitle: `IP Geolocation` });
    }
  } catch (e) {
    captureException(e);
    console.error(e);
  }
};
