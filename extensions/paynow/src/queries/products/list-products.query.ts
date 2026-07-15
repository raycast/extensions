import { createPaynowQuery } from "../create-paynow-query";

export const useProductsList = createPaynowQuery({
  queryKey: "productsList",
  queryFn: async (api) => {
    const { data } = await api.management.products.getProducts();
    return data;
  },
});
