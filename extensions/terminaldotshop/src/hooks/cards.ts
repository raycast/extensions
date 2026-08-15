import { useQuery, useMutation, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useTerminal } from "./auth";
import { useCart } from "./cart";
import Terminal from "@terminaldotshop/sdk";
import Stripe from "stripe";
import { config } from "./config";

const stripe = new Stripe(config().stripe);

const cardsOptions = (terminal: Terminal) => {
  return queryOptions({
    queryKey: ["cards"],
    queryFn: async () => {
      return terminal.card.list().then((r) => r.data);
    },
    initialData: [],
  });
};

export const useCard = (id?: string) => {
  const terminal = useTerminal();
  return useQuery({
    ...cardsOptions(terminal),
    select: (cards) => cards.find((c) => c.id === id),
  });
};

export const useCards = () => {
  const terminal = useTerminal();
  return useQuery(cardsOptions(terminal));
};

export type CreateCardParams = {
  name: string;
  number: string;
  exp_month: string;
  exp_year: string;
  cvc: string;
};

export const useCreateCard = () => {
  const terminal = useTerminal();
  const { refetch } = useCards();
  return useMutation({
    mutationFn: async (args: CreateCardParams) => {
      const token = await stripe.tokens.create({ card: args }).then((r) => r.id);
      await terminal.card.create({ token }).then((r) => r.data);
      await refetch();
    },
  });
};

export const useSetCard = () => {
  const terminal = useTerminal();
  const queryClient = useQueryClient();
  const { data: cart } = useCart();
  return useMutation({
    mutationFn: async (cardID: string) => {
      queryClient.setQueryData(["cart"], { ...cart, cardID });
      await terminal.cart.setCard({ cardID });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};

export const useRemoveCard = () => {
  const terminal = useTerminal();
  const { refetch } = useCart();
  const { refetch: refetchCards } = useCards();
  return useMutation({
    mutationFn: async (cardID: string) => {
      await terminal.card.delete(cardID);
      await Promise.all([refetch(), refetchCards()]);
    },
  });
};
