import { LaunchProps } from "@raycast/api";
import { HISTORY_KEYS } from "./lib/history";
import { formatPrefix, parsePrefix, randomSubnet } from "./lib/ip";
import { ALL_POOLS, PrefixList } from "./lib/prefix-list";
import { COMMON_IPV4, IPV4_LENGTH, PRIVATE_IPV4, SPECIAL_IPV4 } from "./lib/ranges";

function generate(pool: string, length: number) {
  const pools = pool === ALL_POOLS ? PRIVATE_IPV4 : [parsePrefix(pool)];
  return formatPrefix(randomSubnet(pools, length, [...SPECIAL_IPV4, ...COMMON_IPV4]));
}

export default function Command(props: LaunchProps<{ arguments: Arguments.GeneratePrivateIpv4Prefix }>) {
  return (
    <PrefixList
      generate={generate}
      defaultLength={IPV4_LENGTH}
      historyKey={HISTORY_KEYS.ipv4}
      length={props.arguments.length}
      pools={PRIVATE_IPV4.map(formatPrefix)}
    />
  );
}
