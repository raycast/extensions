import GoToListView from "./go-to-list-view";
import { withAuth } from "./auth.provider";

function Command() {
  return <GoToListView object="person" />;
}

export default withAuth(Command);
