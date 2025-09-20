import { EnsureAuthenticated, SpaceList } from "./components";

const searchPlaceholder = "Search spaces...";

export default function Command() {
  return (
    <EnsureAuthenticated placeholder={searchPlaceholder} viewType="list">
      <SpaceList searchPlaceholder={searchPlaceholder} />
    </EnsureAuthenticated>
  );
}
