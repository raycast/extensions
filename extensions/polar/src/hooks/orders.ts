import { OrdersListRequest } from "@polar-sh/sdk/models/operations";
import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { PolarContext } from "../providers";

export const useOrders = ({ ...params }: OrdersListRequest) => {
  const polar = useContext(PolarContext);

  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => polar.orders.list({ ...params }),
  });
};
