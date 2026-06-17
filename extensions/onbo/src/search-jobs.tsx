import SearchList from "./components/SearchList";

/**
 * Entry point for browsing New Grad roles; renders the shared SearchList with "New Grad".
 */
export default function Command() {
  return <SearchList resource={"New Grad"} />;
}
