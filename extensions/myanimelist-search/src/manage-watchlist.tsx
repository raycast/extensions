import { useContext } from "react";

import { ManageWatchList } from "./components/manage-watchlist/manageWatchList";
import { ManageWatchGrid } from "./components/manage-watchlist/manageWatchGrid";
import { ViewTypeCtx, ViewTypeCtxProvider } from "./components/ViewTypeCtx";

function RenderView() {
  const { viewType } = useContext(ViewTypeCtx);

  return viewType === "grid" ? <ManageWatchGrid /> : <ManageWatchList />;
}

export default function ManageWatchlist() {
  return (
    <ViewTypeCtxProvider>
      <RenderView />
    </ViewTypeCtxProvider>
  );
}
