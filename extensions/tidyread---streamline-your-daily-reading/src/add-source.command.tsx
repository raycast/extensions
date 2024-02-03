import RSSSearch from "./components/RSSSearch";
import RedirectRoute from "./components/RedirectRoute";

export default function CreateSourceForm() {
  return (
    <RedirectRoute>
      <RSSSearch />
    </RedirectRoute>
  );
}
