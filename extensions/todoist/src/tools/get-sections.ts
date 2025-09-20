import { getTodoistApi, withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * ID of the project section belongs to
   */
  project_id?: string;
};

export default withTodoistApi(async (input: Input = {}) => {
  const todoistApi = getTodoistApi();

  const { data } = await todoistApi.get("/sections", { params: input });
  return data;
});
