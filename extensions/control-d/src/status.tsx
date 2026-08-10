import { Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { getIP } from "common/learnIP";

const Status = () => {
  const [loading, setLoading] = useState<boolean>(true);

  const [isConnected, setIsConnected] = useState<boolean>(false);

  const [ipv4, setIpv4] = useState<string>("Loading...");
  const [ipv4Org, setIpv4Org] = useState<string>("Loading...");
  const [ipv4Country, setIpv4Country] = useState<string>("Loading...");

  const [ipv6, setIpv6] = useState<string>("Loading...");
  const [ipv6Org, setIpv6Org] = useState<string>("Loading...");
  const [ipv6Country, setIpv6Country] = useState<string>("Loading...");

  const checkConnection = async () => {
    try {
      await axios.get("https://verify.controld.com/ip");
    } catch (err) {
      setIsConnected(false);
      return;
    }
    setIsConnected(true);
  };

  const getIPData = async () => {
    const ipv4 = await getIP(4);
    const ipv6 = await getIP(6);

    setIpv4(ipv4 ? ipv4.ip : "N/A");
    setIpv4Org(ipv4 ? ipv4.org : "N/A");
    setIpv4Country(ipv4 ? ipv4.country : "N/A");
    setIpv6(ipv6 ? ipv6.ip : "N/A");
    setIpv6Org(ipv6 ? ipv6.org : "N/A");
    setIpv6Country(ipv6 ? ipv6.country : "N/A");
  };

  useEffect(() => {
    checkConnection();
    getIPData();

    setLoading(false);
  }, []);

  return (
    <List isLoading={loading}>
      <List.Item
        title="Connection Status"
        subtitle={isConnected ? "Connected" : "Disconnected"}
        icon={isConnected ? Icon.CheckCircle : Icon.Plug}
      />
      <List.Section title="IPv4">
        <List.Item title="IPv4" subtitle={ipv4} icon={Icon.Globe} />
        <List.Item title="Organization" subtitle={ipv4Org} icon={Icon.Building} />
        <List.Item title="Country" subtitle={ipv4Country} icon={Icon.Flag} />
      </List.Section>
      <List.Section title="IPv6">
        <List.Item title="IPv6" subtitle={ipv6} icon={Icon.Globe} />
        <List.Item title="Organization" subtitle={ipv6Org} icon={Icon.Building} />
        <List.Item title="Country" subtitle={ipv6Country} icon={Icon.Flag} />
      </List.Section>
    </List>
  );
};

export default Status;
