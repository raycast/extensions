import { createPaynowQuery } from "../create-paynow-query";

export const useTagsList = createPaynowQuery({
  queryKey: "tagsList",
  queryFn: async (api) => {
    const { data } = await api.management.tags.getTags();
    return data;
  },
});
