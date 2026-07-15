import { ProductsListRequest } from "@polar-sh/sdk/dist/commonjs/models/operations/productslist";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useContext } from "react";
import { PolarContext, queryClient } from "../providers";
import { ProductUpdate } from "@polar-sh/sdk/dist/commonjs/models/components/productupdate";
import { Organization } from "@polar-sh/sdk/dist/commonjs/models/components/organization";
import { ProductCreate } from "@polar-sh/sdk/dist/commonjs/models/components/productcreate";
import { ProductBenefitsUpdate } from "@polar-sh/sdk/dist/commonjs/models/components/productbenefitsupdate";
export const useProducts = ({
  organizationId,
  ...params
}: ProductsListRequest) => {
  const polar = useContext(PolarContext);

  return useQuery({
    queryKey: ["products", organizationId, params],
    queryFn: () => polar.products.list({ organizationId, ...params }),
  });
};

export const useProduct = (id?: string) => {
  const polar = useContext(PolarContext);

  return useQuery({
    queryKey: ["product", id],
    queryFn: () => polar.products.get({ id: id ?? "" }),
    enabled: !!id,
  });
};

export const useCreateProduct = (organization?: Organization) => {
  const polar = useContext(PolarContext);

  return useMutation({
    mutationFn: (body: ProductCreate) => {
      return polar.products.create(body);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ["products", organization?.id],
      });
    },
  });
};

export const useUpdateProductBenefits = (organization?: Organization) => {
  const polar = useContext(PolarContext);

  return useMutation({
    mutationFn: ({
      id,
      params,
    }: {
      id: string;
      params: ProductBenefitsUpdate;
    }) => {
      return polar.products.updateBenefits({
        id,
        productBenefitsUpdate: params,
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ["products", organization?.id],
      });
    },
  });
};

export const useUpdateProduct = (organization?: Organization) => {
  const polar = useContext(PolarContext);

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ProductUpdate }) => {
      return polar.products.update({
        id,
        productUpdate: body,
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ["products", organization?.id],
      });
    },
  });
};
