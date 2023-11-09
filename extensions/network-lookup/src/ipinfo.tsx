import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { LaunchProps } from "@raycast/api";
import net from "net";
interface IPArguments {
  ip?: string;
}

interface IPinfo {
  ip: string;
  hostname: string;
  anycast: boolean;
  city: string;
  country: string;
  region: string;
  org: string;
}

export default function Command(props: LaunchProps<{ arguments: IPArguments }>) {
  const isValid = net.isIP(props.arguments.ip as string);
  if (isValid == 0) {
    return <Detail markdown="Not an IP address" />;
  }
  const { isLoading, data }: { isLoading: boolean; data?: IPinfo } = useFetch(
    `https://ipinfo.io/${props.arguments.ip}`,
    {
      headers: {
        "User-Agent": "curl/8.1.2",
        "Content-Type": "application/json",
      },
    },
  );
  const markdown = `
## IP: ${data?.ip}
## Hostname: ${data?.hostname ?? "N/A"}
## Anycast: ${data?.anycast ?? "false"}
## City: ${data?.city ?? "N/A"}
## Country: ${data?.country ?? "N/A"}
## Region: ${data?.region ?? "N/A"}
## ASN: ${data?.org ?? "No ASN"}`;
  return <Detail isLoading={isLoading} markdown={markdown} />;
}
