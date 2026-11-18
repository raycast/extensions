import { LaunchProps } from "@raycast/api";
import { HISTORY_KEYS } from "./lib/history";
import { formatPrefix, randomSubnet } from "./lib/ip";
import { PrefixList } from "./lib/prefix-list";
import { COMMON_IPV6, IPV6_LENGTH, PRIVATE_IPV6, SPECIAL_IPV6 } from "./lib/ranges";

function generate(_pool: string, length: number) {
  return formatPrefix(randomSubnet(PRIVATE_IPV6, length, [...SPECIAL_IPV6, ...COMMON_IPV6]));
}

export default function Command(props: LaunchProps<{ arguments: Arguments.GeneratePrivateIpv6Prefix }>) {
  return (
    <PrefixList
      generate={generate}
      defaultLength={IPV6_LENGTH}
      historyKey={HISTORY_KEYS.ipv6}
      length={props.arguments.length}
    />
  );
}
