import { OrganizationsListRequest } from "@polar-sh/sdk/models/operations";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { PolarContext, queryClient } from "../providers";
import { OrganizationCreate } from "@polar-sh/sdk/models/components";

export const useOrganizations = (params: OrganizationsListRequest) => {
  const polar = useContext(PolarContext);

  return useQuery({
    queryKey: ["organizations", params],
    queryFn: () => polar.organizations.list(params),
  });
};

export const useOrganization = (id?: string) => {
  const polar = useContext(PolarContext);

  return useQuery({
    queryKey: ["organizations", id],
    queryFn: () => polar.organizations.get({ id: id ?? "" }),
    enabled: !!id,
  });
};

export const useCreateOrganization = () => {
  const polar = useContext(PolarContext);

  return useMutation({
    mutationFn: (body: OrganizationCreate) => {
      return polar.organizations.create(body);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations"],
      });
    },
  });
};
