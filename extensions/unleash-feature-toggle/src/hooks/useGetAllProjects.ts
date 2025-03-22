import { usePromise } from "@raycast/utils";
import { getAllProjects } from "../api";

export const useGetAllProjects = () => {
  return usePromise(async () => {
    const res = await getAllProjects();

    return res.projects;
  });
};
