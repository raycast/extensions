import BrowseCollections from "@commands/BrowseCollections";
import { COMICS_URL } from "@data";

export default function Command() {
  return <BrowseCollections baseUrl={COMICS_URL} />;
}
