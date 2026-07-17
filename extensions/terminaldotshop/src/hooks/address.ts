import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTerminal } from "./auth";
import type { Terminal } from "@terminaldotshop/sdk";
import { useCart } from "./cart";

const addressesOptions = (terminal: Terminal) => {
  return queryOptions({
    queryKey: ["addresses"],
    queryFn: async () => {
      return terminal.address.list().then((r) => r.data);
    },
    initialData: [],
  });
};

export const useAddress = (id?: string) => {
  const terminal = useTerminal();
  return useQuery({
    ...addressesOptions(terminal),
    select: (addresses) => addresses.find((a) => a.id === id),
  });
};

export const useAddresses = () => {
  const terminal = useTerminal();
  return useQuery(addressesOptions(terminal));
};

export const useCreateAddress = () => {
  const terminal = useTerminal();
  const { refetch } = useAddresses();
  return useMutation({
    mutationFn: async (address: Terminal.AddressCreateParams) => {
      return terminal.address.create(address);
    },
    onSuccess: () => refetch(),
  });
};

export const useSetAddress = () => {
  const terminal = useTerminal();
  const qc = useQueryClient();
  const { data: cart } = useCart();
  return useMutation({
    mutationFn: async (addressID: string) => {
      qc.setQueryData(["cart"], { ...cart, addressID });
      await terminal.cart.setAddress({ addressID });
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};

export const useRemoveAddress = () => {
  const terminal = useTerminal();
  const { refetch } = useCart();
  return useMutation({
    mutationFn: async (addressID: string) => {
      await terminal.address.delete(addressID);
      await refetch();
    },
  });
};
