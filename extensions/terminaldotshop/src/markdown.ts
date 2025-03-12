import type { Brew } from "./hooks/items";
import type { Terminal } from "@terminaldotshop/sdk";

const renderBrewItem = (brew: Brew, count: number) => `
> **${brew.title}** --- qty: ${count} --- $${((count * brew.price) / 100).toFixed(0)}
>
> ${brew.subTitle}
`;

export const renderBrew = (brew: Brew) => {
  return `
# **${brew.title}**

${brew.subTitle}

---

> ${brew.description}

---

\`<Enter>\` to +1\t\`<cmd-r>\` to -1
`;
};

export const renderCart = (cart: Terminal.Cart, brews?: Brew[]) => {
  if (!brews) return "";

  const items =
    cart.items.length === 0
      ? "*empty*"
      : cart.items
          .map((item) => {
            const brew = brews.find((b) => b.varId === item.productVariantID);
            if (!brew) return ``;
            return renderBrewItem(brew, item.quantity);
          })
          .join("\n\n");

  return `${items}
---

\`<Enter>\` to buy\t\`<cmd-r>\` to clear
`;
};

export const renderAddress = (address: Terminal.Address, selected: boolean) => {
  return `
# ${address.name}

${address.phone ? "Phone: ${address.phone}\n" : ""}
${address.street1}
${address.street2}
${address.city}, ${address.country} - ${address.zip}

---
\`<Enter>\` to ${selected ? "continue" : "select"}
\`<cmd-r>\` to remove

`;
};

export const renderCard = (card: Terminal.Card, selected: boolean) => {
  return `
# ****-${card.last4}

Brand - ${card.brand}

Expires - ${card.expiration}

---

\`<Enter>\` to ${selected ? "continue" : "select"}
\`<cmd-r>\` to remove

`;
};

export const renderAddCard = () => `
# **Add a card**

We will collect card information here and send the info to Stripe to hold.

---

\`<Enter>\` to collect - \`<Esc>\` to go back
`;

export const renderOrder = (props: {
  loading: boolean;
  index?: number;
  items?: Terminal.Order.Item[];
  address?: Terminal.Order.Shipping;
  brews?: Brew[];
}) => {
  const { loading, brews, items, address, index } = props;
  if (loading) return `# **Preparing your order...**`;

  const indexId = String(index).padStart(3, "0");

  if (!items || !address || !brews) return "*There was an error loading up your order :(*";

  return `
# Order #${indexId} *(zero indexed btw)*

---

## Brews

${items.map((i) => {
  const b = brews.find((b) => b.varId === i.productVariantID);
  if (!b) return "";
  return renderBrewItem(b, i.quantity);
})}

---

## Address

**${address.name}**

${address.phone ? "Phone: ${address.phone}\n" : ""}
${address.street1}
${address.street2}
${address.city}, ${address.country} - ${address.zip}

---

\`<Enter>\` to close
`;
};

export const renderConfirm = (props: {
  loading: boolean;
  items?: Terminal.Cart.Item[];
  address?: Terminal.Address;
  card?: Terminal.Card;
  brews?: Brew[];
}) => {
  const { loading, brews, card, items, address } = props;
  if (loading) return `# ** Preparing your order...** `;

  if (!items || !address || !card || !brews) return "*There was an error loading up your order :(*";

  return `
# **Confirm your order**

---

## Brews

${items.map((i) => {
  const b = brews.find((b) => b.varId === i.productVariantID);
  if (!b) return "";
  return renderBrewItem(b, i.quantity);
})}

---

## Address

**${address.name}**

${address.phone ? "Phone: ${address.phone}\n" : ""}
${address.street1}
${address.street2}
${address.city}, ${address.country} - ${address.zip}

---

## Card
**** -${card.last4}

Brand - ${card.brand}

Expires - ${card.expiration.month}/${card.expiration.year}

---

\`<Enter>\` to place your order
\`<esc>\` to go back
`;
};

export const renderSubscription = (sub?: Terminal.Subscription, brews?: Brew[]) => {
  if (!brews || !sub) return "loading";

  const brew = brews.find((b) => b?.varId === sub.productVariantID);
  if (!brew) return `Could not load up this subscription, ${sub.id}`;

  return `
# You are subscribed to

> ${brew.title}
> ${sub.schedule}

${sub.next ? "Next shipment will be on `${sub.next}`" : ""}

`;
};
