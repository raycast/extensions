import { Action, ActionPanel, closeMainWindow, Detail, Form, Icon, List, useNavigation } from "@raycast/api";
import { Brew, useProducts } from "./hooks/items";
import {
  useAddItem,
  useCart,
  useClearCart,
  useConvertCart,
  useRemoveItem,
  useSubItem,
  useSubscribe,
  useSubscriptions,
} from "./hooks/cart";
import { useMemo } from "react";
import {
  renderAddCard,
  renderAddress,
  renderBrew,
  renderCard,
  renderCart,
  renderConfirm,
  renderOrder,
  renderSubscription,
} from "./markdown";
import { Terminal } from "@terminaldotshop/sdk";
import { withQc } from "./providers";
import { useAddress, useAddresses, useCreateAddress, useRemoveAddress, useSetAddress } from "./hooks/address";
import { FormValidation, useForm, withAccessToken } from "@raycast/utils";
import { supportedCountries } from "./countries";
import { CreateCardParams, useCard, useCards, useCreateCard, useRemoveCard, useSetCard } from "./hooks/cards";
import { useOrder } from "./hooks/orders";
import { provider } from "./hooks/auth";
import luhn from "fast-luhn";

export type Cart = Record<string, number>;

export const TERMINAL_COLOR = "#FF5C00";
export const GRAY_COLOR = "#F0F0F0";

function Command() {
  const { data: products, isLoading } = useProducts();

  return (
    <List isShowingDetail={true} isLoading={isLoading}>
      <CheckoutItem />

      {products && (
        <>
          <List.Section title="Featured">
            {products.featured.map((brew) => (
              <BrewItem brew={brew} key={brew.id} />
            ))}
          </List.Section>
          <List.Section title="Originals">
            {products.original.map((brew) => (
              <BrewItem brew={brew} key={brew.id} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

export default withAccessToken(provider)(() => withQc(<Command />));

const BrewItem = ({ brew }: { brew: Brew }) => {
  const isSubscription = brew.subscription === "required";
  const { mutate: addItem } = useAddItem();
  const { mutate: removeItem } = useRemoveItem();
  const { setSubItem } = useSubItem();
  const { push } = useNavigation();
  const { data: subscriptions } = useSubscriptions();

  const subtTitle = useMemo(() => {
    if (brew.subTitle.includes("|")) return brew.subTitle.split(" | ")[0];
    if (brew.subscription) return "Membership";
  }, [brew.subTitle, brew.subscription]);

  const isSubscribed = useMemo(() => {
    if (!subscriptions || !subscriptions.length) return false;

    return !!subscriptions.find((i) => i.productVariantID === brew.varId);
  }, [subscriptions, brew.varId]);

  const startSub = () => {
    setSubItem({ id: brew.id, varId: brew.varId });
    push(withQc(<Address />));
  };

  return (
    <List.Item
      key={brew.id}
      title={brew.title}
      subtitle={subtTitle}
      detail={<List.Item.Detail markdown={renderBrew(brew)} />}
      icon={{ source: "product.svg", tintColor: brew.color }}
      actions={
        <ActionPanel>
          {isSubscription || !isSubscribed ? (
            <Action title="Subscribe" onAction={startSub} />
          ) : (
            <>
              <Action title="Add to Cart" onAction={() => addItem(brew.id)} />
              <Action
                title="Remove from Cart"
                onAction={() => removeItem(brew.id)}
                shortcut={{ key: "r", modifiers: ["cmd"] }}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
};

const CheckoutItem = () => {
  const { data: cart } = useCart();
  const { mutate: clearCart } = useClearCart();
  const { data: products } = useProducts();
  const { push } = useNavigation();
  const { setSubItem } = useSubItem();

  const subTitle = useMemo(() => {
    if (!cart?.items.length) return "";

    const count = cart.items.reduce((c, n) => c + n.quantity, 0);

    const items = `${count} item${count > 1 ? "s" : ""}`;
    const price = `$${(cart.subtotal / 100).toFixed(0)}`;

    return `${items} - ${price}`;
  }, [cart.items, cart.subtotal]);

  const startCheckout = () => {
    setSubItem(null);
    push(withQc(<Address />));
  };

  return (
    <List.Item
      title="Checkout"
      icon={{ source: "cart.svg", tintColor: "#888" }}
      subtitle={subTitle}
      detail={<List.Item.Detail markdown={renderCart(cart, products?.all)} />}
      actions={
        <ActionPanel>
          {cart.items.length > 0 ? <Action title="Checkout" onAction={() => startCheckout()} /> : <></>}
          <Action title="Clear" shortcut={{ key: "r", modifiers: ["cmd"] }} onAction={clearCart} />
        </ActionPanel>
      }
    />
  );
};

const Address = () => {
  const { data: cart, isLoading: cartLoading } = useCart();
  const { data: addresses, isLoading: addressesLoading } = useAddresses();
  const { mutate: setAddress, isPending: setPending } = useSetAddress();
  const { mutate: removeAddress, isPending: removePending } = useRemoveAddress();

  const selected = useMemo(() => cart.addressID, [cart.addressID]);

  const isLoading = cartLoading || addressesLoading || setPending || removePending;

  return (
    <List isLoading={isLoading} isShowingDetail={true}>
      {addresses.map((a) => (
        <List.Item
          key={a.id}
          title={a.name}
          subtitle={a.street1}
          icon={{ source: "pin.png", tintColor: selected === a.id ? undefined : "#000" }}
          detail={<List.Item.Detail markdown={renderAddress(a, selected === a.id)} />}
          actions={
            !isLoading ? (
              <ActionPanel>
                {selected === a.id ? (
                  <Action.Push title="Continue to Payment" target={withQc(<Cards />)} />
                ) : (
                  <Action title="Set Address" onAction={() => setAddress(a.id)} />
                )}
                <Action
                  title="Remove Address"
                  onAction={() => removeAddress(a.id)}
                  shortcut={{ key: "r", modifiers: ["cmd"] }}
                />
              </ActionPanel>
            ) : (
              <></>
            )
          }
        />
      ))}

      {!addressesLoading && (
        <List.Item
          title={"New delivery address"}
          icon={{ source: Icon.PlusCircle, tintColor: TERMINAL_COLOR }}
          detail={<List.Item.Detail markdown={`# **Add an address**\n\n\`<Enter>\` to add`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Create Address" target={withQc(<CreateAddress />)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};

const CreateAddress = () => {
  const { mutateAsync: create, isPending } = useCreateAddress();
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Terminal.AddressCreateParams>({
    onSubmit: async (values) => {
      await create(values);
      pop();
    },
    validation: {
      name: FormValidation.Required,
      street1: FormValidation.Required,
      city: FormValidation.Required,
      zip: (val) => {
        const error = "Must be a 5 zip code.";
        if (!val) return error;
        if (val.length !== 5) return error;
        if (Number.isNaN(Number(val))) return error;
      },
      country: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isPending}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.TextField title="Address line 1" {...itemProps.street1} />
      <Form.TextField title="Address line 2" {...itemProps.street2} />
      <Form.TextField title="City" {...itemProps.city} />
      <Form.TextField title="Zip Code" {...itemProps.zip} />
      <Form.TextField title="Phone Number" {...itemProps.phone} />
      <Form.Dropdown title="Country" {...itemProps.country}>
        {supportedCountries.map((c) => (
          <Form.Dropdown.Item key={c.code} value={c.code} title={c.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};

const Cards = () => {
  const { data: cards, isLoading: cardsLoading } = useCards();
  const { mutate: setCard, isPending: setPending } = useSetCard();
  const { mutate: removeCard, isPending: deletePending } = useRemoveCard();
  const { data: cart } = useCart();

  const selected = cart.cardID;

  const isLoading = cardsLoading || setPending || deletePending;

  return (
    <List isLoading={isLoading} isShowingDetail={true}>
      {cards.map((c) => (
        <List.Item
          key={c.id}
          title={`****-${c.last4}`}
          subtitle={c.brand}
          icon={{ source: Icon.CreditCard, tintColor: selected === c.id ? undefined : "#000" }}
          detail={<List.Item.Detail markdown={renderCard(c, selected === c.id)} />}
          actions={
            !isLoading ? (
              <ActionPanel>
                {selected === c.id ? (
                  <Action.Push title="Confirm Order" target={withQc(<Confirm />)} />
                ) : (
                  <Action title="Set Card" onAction={() => setCard(c.id)} />
                )}
                <Action
                  title="Remove Card"
                  onAction={() => removeCard(c.id)}
                  shortcut={{ key: "r", modifiers: ["cmd"] }}
                />
              </ActionPanel>
            ) : (
              <></>
            )
          }
        />
      ))}

      <List.Item
        title="New Card"
        subtitle="via Stripe"
        icon={{ source: Icon.PlusCircle, tintColor: TERMINAL_COLOR }}
        detail={<List.Item.Detail markdown={renderAddCard()} />}
        actions={
          <ActionPanel>
            <Action.Push title="Generate URL" target={withQc(<CreateCard />)} />
          </ActionPanel>
        }
      />
    </List>
  );
};

const CreateCard = () => {
  const { mutateAsync, isPending } = useCreateCard();
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateCardParams>({
    onSubmit: async (data) => {
      await mutateAsync(data);
      push(withQc(<Cards />));
    },
    validation: {
      cvc: FormValidation.Required,
      name: FormValidation.Required,
      exp_year: FormValidation.Required,
      exp_month: FormValidation.Required,
      number: (data) => {
        if (!data) return "Required";
        if (!luhn(data)) {
          return "Invalid Credit Card Number";
        }
      },
    },
  });

  const years = useMemo(() => {
    const ys: number[] = [];
    const thisYear = new Date().getFullYear();
    for (let i = 0; i < 30; i++) {
      ys.push(thisYear + i);
    }

    return ys;
  }, []);

  return (
    <Form
      isLoading={isPending}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Card Holder's Name" {...itemProps.name} />
      <Form.PasswordField title="Card Number" {...itemProps.number} />
      <Form.Dropdown title="Expiry Month" {...itemProps.exp_month}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
          <Form.Dropdown.Item value={n.toString()} title={n.toString().padStart(2, "0")} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Expiry Year" {...itemProps.exp_year}>
        {years.map((n) => (
          <Form.Dropdown.Item value={n.toString()} title={n.toString()} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="CVC" {...itemProps.cvc} />
    </Form>
  );
};

const Confirm = () => {
  const { data: cart, isLoading: cartLoading } = useCart();
  const { data: address, isLoading: addressLoading } = useAddress(cart?.addressID);
  const { data: card, isLoading: cardLoading } = useCard(cart?.cardID);
  const { data: brews, isLoading: productsLoading } = useProducts();

  const { subItem } = useSubItem();
  const { mutateAsync: subscribe } = useSubscribe();
  const { mutateAsync: order, isPending } = useConvertCart();

  const { push } = useNavigation();

  const loading = cartLoading || addressLoading || cardLoading || productsLoading;

  const doOrder = async () => {
    if (subItem) {
      const id = await subscribe();
      if (!id) throw new Error("Failed to subscribe");
      push(withQc(<SubscriptionConfirmation id={id} />));
    } else {
      const o = await order();
      push(withQc(<OrderConfirmation id={o.id} />));
    }
  };

  return (
    <Detail
      isLoading={loading || isPending}
      markdown={renderConfirm({ loading, card, items: cart.items, address, brews: brews?.all })}
      actions={
        <ActionPanel>
          <Action title="Order!" onAction={() => doOrder()} />
        </ActionPanel>
      }
    />
  );
};

const OrderConfirmation = ({ id }: { id: string }) => {
  const { data: order, isLoading } = useOrder(id);
  const { data: brews } = useProducts();

  return (
    <Detail
      markdown={renderOrder({
        loading: isLoading,
        brews: brews?.all,
        address: order?.shipping,
        items: order?.items,
        index: order?.index,
      })}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Close Window" onAction={() => closeMainWindow()} />
        </ActionPanel>
      }
    />
  );
};

const SubscriptionConfirmation = ({ id }: { id: string }) => {
  const { data: subs, isLoading } = useSubscriptions();
  const { data: brews } = useProducts();

  const sub = useMemo(() => {
    if (!subs) return;
    return subs.find((s) => s.id === id);
  }, [subs]);

  return (
    <Detail
      markdown={renderSubscription(sub, brews?.all)}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Close Window" onAction={() => closeMainWindow()} />
        </ActionPanel>
      }
    />
  );
};
