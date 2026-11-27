import { PlaceList } from "./lists";

export default function Command() {
  return <PlaceList pick={(settings) => settings.recent} empty="No recent folders yet" noun="recent folders" />;
}
