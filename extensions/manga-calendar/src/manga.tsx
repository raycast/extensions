import BrowseCollections from "@commands/BrowseCollections";
import { MANGA_URL } from "@data";

export default function Command() {
  return <BrowseCollections baseUrl={MANGA_URL} />;
}
