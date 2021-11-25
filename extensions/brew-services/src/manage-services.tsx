import { useEffect, useState } from "react";
import { BrewItemList, getServices, serviceType } from "./services";

export default function Command() {
  const [services, setServices] = useState<serviceType[]>();
  useEffect(() => {
    getServices().then((service) => setServices(service));
  });

  return <BrewItemList services={services} />;
}
