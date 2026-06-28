import { APIFetch, GET_TASKS_BY_NAME } from "./queries.js";

const getTasks = async (name: string) => {
  const res = await APIFetch(GET_TASKS_BY_NAME, {
    name: name,
  });

  return res.aimlab.tasks;
};

export default getTasks;
