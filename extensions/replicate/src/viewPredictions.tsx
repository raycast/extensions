import { useEffect, useState } from "react";
import { useDatabase } from "./hooks/useDatabase";
import { GridView } from "./views/GridView";
import { ListDetails } from "./views/ListDetails";

export default function ViewPredictions() {
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);
  const dbInit = useDatabase();

  useEffect(() => {
    // When the db has finished indexing, set ready to true
    if (!dbInit) return;
    setReady(true);
  }, [dbInit]);

  if (search) {
    return <ListDetails isLoading={!ready} search={search} setSearch={setSearch} />;
  }
  return <GridView isLoading={!ready} onSearchTextChange={setSearch} />;
}
