import { type Terminal } from "@terminaldotshop/sdk";
import { useTerminal } from "./auth";
import { useProducts } from "./items";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

// Track active mutations to prevent unnecessary refetches
const activeMutations = new Map<string, number>();

type SubItemData = {
  id: string;
  varId: string;
} | null;

const store = new Store<{ subItem: SubItemData }>({
  subItem: null,
});

export const useSubItem = () => {
  const subItem = useStore(store, (s) => s.subItem);

  const setSubItem = (subItem: SubItemData) => {
    store.setState((s) => ({
      ...s,
      subItem,
    }));
  };

  return { subItem, setSubItem };
};

export const useSubscribe = () => {
  const terminal = useTerminal();
  const { subItem } = useSubItem();
  const { data: cart } = useCart();
  return useMutation({
    mutationFn: async () => {
      if (!subItem) return;
      if (!cart.cardID || !cart.addressID) return;

      return await terminal.subscription
        .create({
          id: subItem.id,
          productVariantID: subItem.varId,
          quantity: 1,
          cardID: cart.cardID,
          addressID: cart.addressID,
        })
        .then((r) => r.data);
    },
  });
};

export const useSubscriptions = () => {
  const terminal = useTerminal();
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      return terminal.subscription.list().then((r) => r.data);
    },
  });
};

export const useCart = () => {
  const terminal = useTerminal();
  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: () =>
      terminal.cart.get().then((r) => {
        return r.data;
        return r.data;
      }),
    initialData: {
      subtotal: 0,
      items: [],
      amount: {
        subtotal: 0,
        shipping: 0,
      },
    } as Terminal.Cart,
  });

  return { ...cartQuery };
};

type SetItemParams = {
  id: string;
  operation: "add" | "remove";
};

export const useSetItem = () => {
  const terminal = useTerminal();
  const { data: products } = useProducts();
  const { data: cart } = useCart();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, operation }: SetItemParams) => {
      if (!products) return;

      const brew = products.all.find((p) => p.id === id);
      if (!brew) return;

      let cartItem = cart.items.find((i) => i.productVariantID === brew.varId);
      if (!cartItem) {
        cartItem = { subtotal: 0, quantity: 0, id: brew.id, productVariantID: brew.varId } as Terminal.Cart.Item;
      }

      // Calculate new quantity based on operation
      let newQuantity = cartItem.quantity;
      if (operation === "add") {
        newQuantity += 1;
      } else if (operation === "remove") {
        if (cartItem.quantity <= 0) return;
        newQuantity = Math.max(0, cartItem.quantity - 1);
      }

      const toPut = { productVariantID: brew.varId, quantity: newQuantity };
      return terminal.cart.setItem(toPut).then((r) => r.data);
    },
    onMutate: async ({ id, operation }: SetItemParams) => {
      if (!products) return;

      const brew = products.all.find((p) => p.id === id);
      if (!brew) return;

      // Track the start of a mutation for this product
      const key = `${operation}-${brew.varId}`;
      const count = activeMutations.get(key) || 0;
      activeMutations.set(key, count + 1);

      // Cancel any outgoing refetches for this cart
      await qc.cancelQueries({ queryKey: ["cart"] });

      // Snapshot the current cart
      const previousCart = qc.getQueryData<Terminal.Cart>(["cart"]);
      if (!previousCart) return { previousCart: null, key };

      // Find the cart item
      let cartItem = previousCart.items.find((i) => i.productVariantID === brew.varId);

      // Skip invalid operations
      if (operation === "remove" && (!cartItem || cartItem.quantity <= 0)) {
        return { previousCart, key };
      }

      if (!cartItem) {
        cartItem = { subtotal: 0, quantity: 0, id: brew.id, productVariantID: brew.varId } as Terminal.Cart.Item;
      }

      const otherItems = previousCart.items.filter((i) => i.productVariantID !== brew.varId);

      // Calculate new quantity and subtotal adjustment based on operation
      let newQuantity = cartItem.quantity;
      let subtotalAdjustment = 0;

      if (operation === "add") {
        newQuantity += 1;
        subtotalAdjustment = brew.price;
      } else if (operation === "remove") {
        newQuantity = Math.max(0, cartItem.quantity - 1);
        subtotalAdjustment = -brew.price;
      }

      // Optimistically update the cart
      qc.setQueryData(["cart"], {
        ...previousCart,
        items: [...otherItems, { ...cartItem, quantity: newQuantity }],
        subtotal: previousCart.subtotal + subtotalAdjustment,
      });

      return { previousCart, key };
    },
    onError: (_, __, context) => {
      if (context?.previousCart) {
        qc.setQueryData(["cart"], context.previousCart);
      }
    },
    onSettled: (_, __, ___, context) => {
      if (!context?.key) return;

      // Decrement the active mutation count
      const count = activeMutations.get(context.key) || 0;
      if (count <= 1) {
        activeMutations.delete(context.key);

        // Only invalidate if this was the last pending mutation for this product operation
        const prefix = context.key.split("-")[0]; // 'add' or 'remove'
        if (!Array.from(activeMutations.keys()).some((k) => k.startsWith(`${prefix}-`))) {
          qc.invalidateQueries({ queryKey: ["cart"] });
        }
      } else {
        activeMutations.set(context.key, count - 1);
      }
    },
  });
};

// Removed compatibility hooks

export const useClearCart = () => {
  const terminal = useTerminal();
  const { data: products } = useProducts();
  const { data: cart, refetch } = useCart();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!products) return;

      const items = cart.items.filter((i) => i.quantity > 0);
      if (!items.length) return;

      const prom = Promise.all(items.map((i) => terminal.cart.setItem({ ...i, quantity: 0 }).then((r) => r.data)));
      qc.setQueryData(["cart"], {
        ...cart,
        subtotal: 0,
        items: [],
      });

      await prom;
      await refetch();
    },
  });
};

export const useConvertCart = () => {
  const terminal = useTerminal();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const order = await terminal.cart.convert().then((r) => r.data);
      qc.setQueryData(["orders", order.id], order);
      return order;
    },
  });
};
