import { LaunchProps } from "@raycast/api";
import { BoardView } from "./components/board-view";
import { getBoardIssues } from "./lib/source";

/** Manage Boards launches this with the board it opens. */
interface BoardContext {
  boardId?: string;
}

export default function Command({ launchContext }: LaunchProps<{ launchContext?: BoardContext }>) {
  return (
    <BoardView
      id="board"
      boardId={launchContext?.boardId}
      createDefaults={{ addToSprint: true }}
      load={getBoardIssues}
    />
  );
}
