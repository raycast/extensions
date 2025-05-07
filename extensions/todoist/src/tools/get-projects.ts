import { withTodoistApi, getTodoistApi } from "../helpers/withTodoistApi";

export default withTodoistApi(async () => {
  const todoistApi = getTodoistApi();

  const { data } = await todoistApi.get("/projects");
  return data;
});
