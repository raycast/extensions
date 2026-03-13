import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  Form,
  Icon,
  Image,
  Keyboard,
  List,
  useNavigation,
} from "@raycast/api";
import { Brew, useProducts } from "./hooks/items";
import {
  useCart,
  useClearCart,
  useConvertCart,
  useSetItem,
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
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Add your favorite brew to cart"
      selectedItemId={products && products.featured[0].id}
    >
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

function BrewItem(props: { brew: Brew; first?: boolean }) {
  const isSubscription = props.brew.subscription === "required";
  const subItem = useSubItem();
  const nav = useNavigation();
  const cart = useCart();
  const setItem = useSetItem();

  const subtTitle = useMemo(() => {
    if (props.brew.subTitle.includes("|")) return props.brew.subTitle.split(" | ")[0];
    if (props.brew.subscription) return "Membership";
  }, [props.brew.subTitle, props.brew.subscription]);

  const quantity = useMemo(() => {
    if (!cart.data?.items?.length) return 0;
    const item = cart.data.items.find((i) => i.productVariantID === props.brew.varId);
    return item?.quantity || 0;
  }, [cart.data?.items, props.brew.varId]);

  const startSub = () => {
    subItem.setSubItem({ id: props.brew.id, varId: props.brew.varId });
    nav.push(withQc(<Address />));
  };

  const startCheckout = () => {
    subItem.setSubItem(null);
    nav.push(withQc(<Address />));
  };

  const icon: Image = (() => {
    console.log(props.brew.title);
    switch (props.brew.title) {
      case "artisan":
        return { source: "product-laravel-artisan.png" };
      case "cron":
        return { source: "product-cron.png" };
      case "flow":
        return { source: "product-raycast-flow.png" };
      case "dark mode":
        return { source: "product-dark-mode.png" };
      case "[object Object]":
        return { source: "product-object.png" };
      case "segfault":
        return { source: "product-segfault.png" };
      case "404":
        return { source: "product-404.png" };
      default:
        return { source: "product.svg", tintColor: props.brew.color };
    }
  })();

  return (
    <List.Item
      id={props.brew.id}
      key={props.brew.id}
      title={props.brew.title}
      subtitle={subtTitle}
      detail={<List.Item.Detail markdown={renderBrew(props.brew, quantity)} />}
      icon={icon}
      actions={
        <ActionPanel>
          {isSubscription ? (
            <Action title="Subscribe" icon={Icon.CheckRosette} onAction={startSub} />
          ) : (
            <>
              <Action
                title="Add to Cart"
                icon={Icon.Plus}
                shortcut={{ key: "arrowRight", modifiers: [] }}
                onAction={() => setItem.mutateAsync({ id: props.brew.id, operation: "add" })}
              />
              <Action
                title="Remove from Cart"
                icon={Icon.Minus}
                onAction={() => setItem.mutateAsync({ id: props.brew.id, operation: "remove" })}
                shortcut={{ key: "arrowLeft", modifiers: [] }}
              />
              {cart.data.items.length > 0 ? (
                <Action
                  title="Checkout"
                  icon={Icon.Cart}
                  onAction={() => startCheckout()}
                  shortcut={{ key: "return", modifiers: ["cmd"] }}
                />
              ) : (
                <></>
              )}
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

const CheckoutItem = () => {
  const cart = useCart();
  const clearCart = useClearCart();
  const products = useProducts();
  const nav = useNavigation();
  const subItem = useSubItem();

  const subTitle = useMemo(() => {
    if (!cart.data?.items.length) return "";

    const count = cart.data.items.reduce((c, n) => c + n.quantity, 0);

    const items = `${count} item${count > 1 ? "s" : ""}`;
    const price = `$${(cart.data.subtotal / 100).toFixed(0)}`; // Display in dollars

    return `${items} - ${price}`;
  }, [cart.data?.items, cart.data?.subtotal]);

  const startCheckout = () => {
    subItem.setSubItem(null);
    nav.push(withQc(<Address />));
  };

  return (
    <List.Item
      title="Checkout"
      icon={{ source: "cart.svg", tintColor: "#888" }}
      subtitle={subTitle}
      detail={<List.Item.Detail markdown={renderCart(cart.data, products.data?.all)} />}
      actions={
        <ActionPanel>
          {cart.data.items.length > 0 && (
            <>
              <Action title="Checkout" icon={Icon.Cart} onAction={() => startCheckout()} />
              <Action
                title="Clear"
                shortcut={Keyboard.Shortcut.Common.Remove}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={clearCart.mutate}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
};

const Address = () => {
  const cart = useCart();
  const addresses = useAddresses();
  const setAddress = useSetAddress();
  const removeAddress = useRemoveAddress();
  const nav = useNavigation();

  const selected = useMemo(() => cart.data.addressID, [cart.data.addressID]);

  const isLoading = cart.isLoading || addresses.isLoading || setAddress.isPending || removeAddress.isPending;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for an address"
      isShowingDetail={true}
      navigationTitle="Terminal.Shop - Delivery Addresses"
    >
      {addresses.data.map((a) => (
        <List.Item
          key={a.id}
          title={a.name}
          subtitle={a.street1}
          icon={{ source: "pin.png", tintColor: selected === a.id ? undefined : "#000" }}
          detail={<List.Item.Detail markdown={renderAddress(a, selected === a.id)} />}
          actions={
            !isLoading ? (
              <ActionPanel>
                <Action
                  title="Set Address"
                  onAction={async () => {
                    setAddress.mutate(a.id);
                    nav.push(withQc(<Cards />));
                  }}
                />
                <Action
                  title="Remove Address"
                  onAction={() => removeAddress.mutate(a.id)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            ) : (
              <></>
            )
          }
        />
      ))}

      {!addresses.isLoading && (
        <List.Item
          title={"New delivery address"}
          icon={{ source: Icon.PlusCircle, tintColor: TERMINAL_COLOR }}
          detail={<List.Item.Detail markdown={`# **Add an address**\n\n\`<Enter>\` to add a new address`} />}
          actions={
            <ActionPanel>
              <Action.Push title="Create Address" icon={Icon.House} target={withQc(<CreateAddress />)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};

const CreateAddress = () => {
  const create = useCreateAddress();
  const nav = useNavigation();
  const { handleSubmit, itemProps } = useForm<Terminal.AddressCreateParams>({
    onSubmit: async (values) => {
      await create.mutateAsync(values);
      nav.pop();
    },
    validation: {
      name: FormValidation.Required,
      street1: FormValidation.Required,
      city: FormValidation.Required,
      zip: FormValidation.Required,
      country: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={create.isPending}
      navigationTitle="Terminal.Shop - Create Address"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.TextField title="Address Line 1" {...itemProps.street1} />
      <Form.TextField title="Address Line 2" {...itemProps.street2} />
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
  const cards = useCards();
  const setCard = useSetCard();
  const removeCard = useRemoveCard();
  const cart = useCart();

  const selected = cart.data.cardID;

  const isLoading = cards.isLoading || setCard.isPending || removeCard.isPending;

  return (
    <List isLoading={isLoading} isShowingDetail={true}>
      {cards.data.map((c) => (
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
                  <Action title="Set Card" onAction={() => setCard.mutate(c.id)} />
                )}
                <Action
                  title="Remove Card"
                  onAction={() => removeCard.mutate(c.id)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
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
  const createCard = useCreateCard();
  const nav = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateCardParams>({
    onSubmit: async (data) => {
      await createCard.mutateAsync(data);
      nav.push(withQc(<Cards />));
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
      isLoading={createCard.isPending}
      navigationTitle="Terminal.Shop - Create Card"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Card Holder's Name" {...itemProps.name} />
      <Form.TextField title="Card Number" {...itemProps.number} />
      <Form.Dropdown title="Expiry Month" {...itemProps.exp_month}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <Form.Dropdown.Item value={n.toString()} title={n.toString().padStart(2, "0")} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Expiry Year" {...itemProps.exp_year}>
        {years.map((n) => (
          <Form.Dropdown.Item value={n.toString()} title={n.toString()} />
        ))}
      </Form.Dropdown>
      <Form.PasswordField title="CVC" {...itemProps.cvc} />
    </Form>
  );
};

const Confirm = () => {
  const cart = useCart();
  const address = useAddress(cart.data?.addressID);
  const card = useCard(cart.data?.cardID);
  const products = useProducts();

  const subItem = useSubItem();
  const subscribe = useSubscribe();
  const convertCart = useConvertCart();

  const nav = useNavigation();

  const loading = cart.isLoading || address.isLoading || card.isLoading || products.isLoading;

  const doOrder = async () => {
    if (subItem.subItem) {
      const id = await subscribe.mutateAsync();
      if (!id) throw new Error("Failed to subscribe");
      nav.push(withQc(<SubscriptionConfirmation id={id} />));
    } else {
      const o = await convertCart.mutateAsync();
      nav.push(withQc(<OrderConfirmation id={o.id} />));
    }
  };

  return (
    <Detail
      isLoading={loading || convertCart.isPending}
      markdown={renderConfirm({
        loading,
        card: card.data,
        items: cart.data.items,
        address: address.data,
        brews: products.data?.all,
        cart: cart.data,
      })}
      actions={
        <ActionPanel>
          <Action title="Order!" onAction={() => doOrder()} />
        </ActionPanel>
      }
    />
  );
};

const OrderConfirmation = ({ id }: { id: string }) => {
  const order = useOrder(id);
  const products = useProducts();

  return (
    <Detail
      markdown={renderOrder({
        loading: order.isLoading,
        brews: products.data?.all,
        address: order.data?.shipping,
        items: order.data?.items,
        index: order.data?.index,
        order: order.data,
      })}
      isLoading={order.isLoading}
      actions={
        <ActionPanel>
          <Action title="Close Window" onAction={() => closeMainWindow()} />
        </ActionPanel>
      }
    />
  );
};

const SubscriptionConfirmation = ({ id }: { id: string }) => {
  const subs = useSubscriptions();
  const products = useProducts();

  const sub = useMemo(() => {
    if (!subs.data) return;
    return subs.data.find((s) => s.id === id);
  }, [subs.data, id]);

  return (
    <Detail
      markdown={renderSubscription(sub, products.data?.all)}
      isLoading={subs.isLoading}
      actions={
        <ActionPanel>
          <Action title="Close Window" onAction={() => closeMainWindow()} />
        </ActionPanel>
      }
    />
  );
};
