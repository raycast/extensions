import ServiceList from "./ServiceList";
import { Service } from "./types/common";

const services: Service[] = [
  { id: "helsinki", name: "Helsinki", url: "https://helsinki.fluentprogress.fi/outdoors/", country: "Finland" },
  { id: "jyvaskyla", name: "Jyväskylä", url: "https://jyvaskyla.fluentprogress.fi/outdoors/", country: "Finland" },
  { id: "kuopio", name: "Kuopio", url: "https://kuopio.fluentprogress.fi/outdoors/", country: "Finland" },
  { id: "kuusamo", name: "Kuusamo", url: "https://kuusamo.fluentprogress.fi/outdoors/", country: "Finland" },
  { id: "oulu", name: "Oulu", url: "https://oulu.fluentprogress.fi/outdoors/", country: "Finland" },
  { id: "tampere", name: "Tampere", url: "https://tampere.fluentprogress.fi/outdoors/", country: "Finland" },
];

export default function Command() {
  return <ServiceList services={services} />;
}
