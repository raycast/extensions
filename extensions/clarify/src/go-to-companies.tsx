import GoToListView from "./go-to-list-view";
import { withAuth } from "./auth.provider";

function Command() {
  return <GoToListView object="company" />;
}

export default withAuth(Command);
