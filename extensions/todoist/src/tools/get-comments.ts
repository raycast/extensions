import { withTodoistApi, getTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * ID of the task used to filter comments
   * Note: Either task_id or project_id must be provided
   */
  task_id?: string;

  /**
   * ID of the project used to filter comments
   * Note: Either task_id or project_id must be provided
   */
  project_id?: string;
};

export default withTodoistApi(async (input: Input) => {
  const todoistApi = getTodoistApi();

  const { data } = await todoistApi.get("/comments", { params: input });
  return data;
});
