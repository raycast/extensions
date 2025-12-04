import { useEffect, useState } from "react";
import { List, LaunchProps, Icon, Color } from "@raycast/api";
import isValidToken from "./utils/is-valid-token";
import { checkDomainAvailability } from "./vercel";

export default function Command({ arguments: { domain } }: LaunchProps<{ arguments: { domain: string } }>) {
  const [isLoading, setIsLoading] = useState(true);
  const [availability, setAvailability] = useState<null | boolean>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        isValidToken();
        const result = await checkDomainAvailability(domain);
        setAvailability(typeof result === "boolean" ? result : false);
      } catch (error) {
        console.error("Error checking domain availability:", error);
        setAvailability(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [domain]);

  return (
    <List isLoading={isLoading}>
      {availability ? (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="Available"
          description={`${domain} is available.`}
        />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Not Available"
          description={`${domain} is not available.`}
        />
      )}
    </List>
  );
}
