import { SearchFilesView } from "./search-files";

/**
 * Open/Save assisted mode shares the persisted index and fzf search engine
 * with the normal Search Files command. It never performs an fd scan.
 */
export default function SearchInDialog() {
  return <SearchFilesView dialogMode />;
}
