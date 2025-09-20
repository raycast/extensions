import { useQuery } from "@tanstack/react-query";
import { useTerminal } from "./auth";

export const useOrders = () => {
  const terminal = useTerminal();
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => terminal.order.list().then((r) => r.data),
  });
};

export const useOrder = (id: string) => {
  const terminal = useTerminal();
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => terminal.order.get(id).then((r) => r.data),
  });
};
