import { EnsureAuthenticated, SpaceList } from "./components";

const searchPlaceholder = "Search channels...";

export default function Command() {
  return (
    <EnsureAuthenticated placeholder={searchPlaceholder} viewType="list">
      <SpaceList searchPlaceholder={searchPlaceholder} />
    </EnsureAuthenticated>
  );
}
