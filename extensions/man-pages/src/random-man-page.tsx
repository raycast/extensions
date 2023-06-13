import { Detail } from "@raycast/api";
import { useGetManPages } from "./utils";
import { Results } from "./components/Results";

export default function Main() {
  // Select a random man page entry and display it
  const pages = useGetManPages();

  if (pages.length) {
    const page = pages[Math.floor(Math.random() * pages.length)];
    return <Results command={page} />;
  }
  return <Detail isLoading={true} />;
}
