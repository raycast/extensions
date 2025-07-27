import { useContext } from "react";

import SearchAnimeGrid from "./components/index/searchAnimeGrid";
import SearchAnimeList from "./components/index/searchAnimeList";
import { ViewTypeCtx, ViewTypeCtxProvider } from "./components/ViewTypeCtx";

function RenderView() {
  const { viewType } = useContext(ViewTypeCtx);

  return viewType === "grid" ? <SearchAnimeGrid /> : <SearchAnimeList />;
}

export default function Index() {
  return (
    <ViewTypeCtxProvider>
      <RenderView />
    </ViewTypeCtxProvider>
  );
}
