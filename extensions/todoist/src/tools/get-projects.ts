import { withTodoistApi, getTodoistRestApi } from "../helpers/withTodoistApi";

export default withTodoistApi(async () => {
  const todoistApi = getTodoistRestApi();

  const { data } = await todoistApi.get("/projects");
  return data;
});
