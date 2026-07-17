import { getActivity } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

export default withTodoistApi(async function () {
  const events = await getActivity();
  return events;
});
