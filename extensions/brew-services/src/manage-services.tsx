import { useEffect, useState } from "react";
import { BrewItemList, getServices, Service } from "./services";

export default function Command() {
  const [services, setServices] = useState<Service[]>();
  useEffect(() => {
    getServices().then((service) => setServices(service));
  });

  return <BrewItemList services={services} />;
}
