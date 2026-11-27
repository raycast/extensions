import { PlaceList } from "./lists";

export default function Command() {
  return <PlaceList pick={(settings) => settings.favorites} empty="No favorites in forkz's sidebar" noun="favorites" />;
}
