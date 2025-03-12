import { type Terminal } from "@terminaldotshop/sdk";
import { useTerminal } from "./auth";
import { useProducts } from "./items";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

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
    queryFn: () => terminal.cart.get().then((r) => r.data),
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

export const useAddItem = () => {
  const terminal = useTerminal();
  const { data: products } = useProducts();
  const { data: cart } = useCart();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!products) return;

      const brew = products.all.find((p) => p.id === id);
      if (!brew) return;

      let cartItem = cart.items.find((i) => i.productVariantID === brew.varId);
      if (!cartItem) {
        cartItem = { subtotal: 0, quantity: 0, id: brew.id, productVariantID: brew.varId } as Terminal.Cart.Item;
      }

      const otherItems = cart.items.filter((i) => i.productVariantID !== brew.varId);

      const toPut = { productVariantID: brew.varId, quantity: cartItem.quantity + 1 };
      const prom = terminal.cart.setItem(toPut).then((r) => r.data);
      qc.setQueryData(["cart"], {
        ...cart,
        items: [...otherItems, { ...cartItem, quantity: toPut.quantity }],
        subtotal: cart.subtotal + brew.price,
      });

      const newCart = await prom;
      qc.setQueryData(["cart"], newCart);
    },
  });
};

export const useRemoveItem = () => {
  const terminal = useTerminal();
  const { data: products } = useProducts();
  const { data: cart } = useCart();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!products) return;

      const brew = products.all.find((p) => p.id === id);
      if (!brew) return;

      const cartItem = cart.items.find((i) => i.productVariantID === brew.varId);
      if (!cartItem) return;

      const otherItems = cart.items.filter((i) => i.productVariantID !== brew.varId);
      const prom = terminal.cart
        .setItem({ productVariantID: brew.varId, quantity: cartItem.quantity - 1 })
        .then((r) => r.data);

      qc.setQueryData(["cart"], {
        ...cart,
        items: [...otherItems, { ...cartItem, quantity: cartItem.quantity - 1 }],
        subtotal: cart.subtotal - brew.price,
      });

      const newCart = await prom;
      qc.setQueryData(["cart"], newCart);
    },
  });
};

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
