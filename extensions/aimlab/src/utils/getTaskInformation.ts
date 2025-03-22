import { APIFetch, GET_TASK_INFORMATION } from "./queries.js";

const getTaskInformation = async (slug: string) => {
  const res = await APIFetch(GET_TASK_INFORMATION, {
    slug: slug,
  });

  return res.aimlab.task;
};

export default getTaskInformation;
