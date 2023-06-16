import { useState } from "react";
import { ArchivesView, MainView } from "./components";
import { useArchive, useHistories } from "./hooks";
import { IndexContext } from "./context";
import { List } from "@raycast/api";

export default function Command() {
  const [input, setInput] = useState("");
  const [showMainView, setShowMainView] = useState(true);
  const { histories, handleSetHistories, clearHistories } = useHistories();
  const { archives, setArchives, handleSetArchives } = useArchive();

  const toggleMainView = () => {
    setInput("");
    setShowMainView(!showMainView);
  };

  return (
    <List
      isShowingDetail={!showMainView}
      searchText={input}
      filtering={!showMainView}
      onSearchTextChange={(text) => setInput(text)}
      searchBarPlaceholder={showMainView ? "Input prompt" : "Search Archives"}
    >
      <IndexContext.Provider
        value={{
          histories,
          handleSetArchives,
          handleSetHistories,
          clearHistories,
          archives,
          setArchives,
          input,
          setInput,
        }}
      >
        {showMainView ? <MainView toggleMainView={toggleMainView} /> : <ArchivesView toggleMainView={toggleMainView} />}
      </IndexContext.Provider>
    </List>
  );
}
