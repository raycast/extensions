import AppProvider from "./contexts/AppContext";
import GiphySearch from "./components/GiphySearch";
import "./fetch-polyfill";

export default function Command() {
  return (
    <AppProvider>
      <GiphySearch />
    </AppProvider>
  );
}
