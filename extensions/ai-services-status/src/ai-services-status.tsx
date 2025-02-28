import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { services } from "./services";
import { ServiceStatusItem } from "./components/ServiceStatusItem";

export default function Command() {
  // Since each service request is handled independently, we only need to manage loading state
  const [isLoading, setIsLoading] = useState(true);

  // Set to false during initial loading
  useEffect(() => {
    // Short delay to give UI time to render
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <List isLoading={isLoading}>
      {services.map((service) => (
        <ServiceStatusItem key={service.name} service={service} />
      ))}
    </List>
  );
}
