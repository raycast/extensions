import { BoardView } from "./components/board-view";
import { getBacklogIssues } from "./lib/source";

export default function Command() {
  return <BoardView id="backlog" load={getBacklogIssues} />;
}
