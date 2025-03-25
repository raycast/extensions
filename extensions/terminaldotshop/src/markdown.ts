import type { Brew } from "./hooks/items";
import type { Terminal } from "@terminaldotshop/sdk";

export const renderBrew = (brew: Brew, quantity: number = 0) => {
  return `
# ${brew.title}

> *${brew.subTitle}*

${brew.description}

${brew.subscription === "required" ? `*Membership required*\n\n\`<Enter>\` to subscribe` : `\`←\` ${quantity} \`→\``}
`;
};

export const renderCart = (cart: Terminal.Cart, brews?: Brew[]) => {
  if (!brews) return "";

  if (cart.items.length === 0) {
    return `*Cart is empty*

\`<Enter>\` to buy\t\`<ctrl-x>\` to clear
`;
  }

  const itemsTableRows = cart.items
    .map((item) => {
      const brew = brews.find((b) => b.varId === item.productVariantID);
      if (!brew) return "";
      return `| ${brew.title} | ${item.quantity} | $${((item.quantity * brew.price) / 100).toFixed(0)} |`;
    })
    .join("\n");

  return `## Items
| Item | Quantity | Cost |
|------|----------|------|
${itemsTableRows}

\`<Enter>\` to buy\t\`<ctrl-x>\` to clear
`;
};

export const renderAddress = (address: Terminal.Address, selected: boolean) => {
  return `
# ${address.name} ${selected ? "✓" : ""}

\`\`\`
${address.street1}
${address.street2 ? address.street2 + "\n" : ""}${address.city}, ${address.country} ${address.zip}
${address.phone ? "📞 " + address.phone : ""}
\`\`\`

\`<Enter>\` to ${selected ? "continue" : "select"}
\`<ctrl-x>\` to remove
`;
};

export const renderCard = (card: Terminal.Card, selected: boolean) => {
  return `
# 💳 ${card.brand} ${selected ? "✓" : ""}

\`\`\`
**** **** **** ${card.last4}
Expires: ${card.expiration}
\`\`\`

\`<Enter>\` to ${selected ? "continue" : "select"}
\`<ctrl-x>\` to remove
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
  order?: Terminal.Order;
}) => {
  const { loading, brews, items, address, order } = props;
  if (loading) return `# **Preparing your order...**`;

  if (!items || !address || !brews) return "*There was an error loading up your order :(*";

  return `
# Order Placed

---

## Items

| Item | Quantity | Cost |
|------|----------|------|
${items
  .map((i) => {
    const b = brews.find((b) => b.varId === i.productVariantID);
    if (!b) return "";
    return `| ${b.title} | ${i.quantity} | $${((i.quantity * b.price) / 100).toFixed(0)} |`;
  })
  .join("\n")}

## Pricing
| | Amount |
|------|-------|
| Subtotal | $${
    order?.amount?.subtotal
      ? (order.amount.subtotal / 100).toFixed(0)
      : items
          .reduce((total, item) => {
            const brew = brews.find((b) => b.varId === item.productVariantID);
            if (!brew) return total;
            return total + (item.quantity * brew.price) / 100;
          }, 0)
          .toFixed(0)
  } |
| Shipping | $${order?.amount.shipping ? order.amount.shipping / 100 : "0"} |
| **Total** | **$${(order!.amount.shipping + order!.amount.subtotal) / 100}** |

---

## 📍 Shipping Address
\`\`\`
${address.name}
${address.street1}
${address.street2 ? address.street2 + "\n" : ""}${address.city}, ${address.country} ${address.zip}
${address.phone ? "📞 " + address.phone : ""}
\`\`\`

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
  cart?: Terminal.Cart;
}) => {
  const { loading, brews, card, items, address, cart } = props;
  if (loading) return `# ** Preparing your order...** `;

  if (!items || !address || !card || !brews) return "*There was an error loading up your order :(*";

  return `
# Confirm your order

## Items
| Item | Quantity | Cost |
|------|----------|------|
${items
  .map((i) => {
    const b = brews.find((b) => b.varId === i.productVariantID);
    if (!b) return "";
    return `| ${b.title} | ${i.quantity} | $${((i.quantity * b.price) / 100).toFixed(0)} |`;
  })
  .join("\n")}

## Pricing
| | Amount |
|------|-------|
| Subtotal | $${(cart!.subtotal / 100).toFixed(0)} |
| Shipping | $${((cart!.amount.shipping || 0) / 100).toFixed(0)} |
| **Total** | **$${((cart!.amount.subtotal + (cart!.amount.shipping || 0)) / 100).toFixed(0)}** |

## 📍 Shipping Address
\`\`\`
${address.name}
${address.street1}
${address.street2 ? address.street2 + "\n" : ""}${address.city}, ${address.country} ${address.zip}
${address.phone ? "📞 " + address.phone : ""}
\`\`\`

## 💳 Payment Method
\`\`\`
${card.brand}
**** **** **** ${card.last4}
Expires: ${card.expiration.month}/${card.expiration.year}
\`\`\`

\`<Enter>\` to place your order
\`<esc>\` to go back
`;
};

export const renderSubscription = (sub?: Terminal.Subscription, brews?: Brew[]) => {
  if (!brews || !sub) return "loading";

  const brew = brews.find((b) => b.varId === sub.productVariantID);
  if (!brew) return `Could not load up this subscription, ${sub.id}`;

  return `
# You are subscribed to

> ${brew.title}
> ${sub.schedule}

${sub.next ? "Next shipment will be on `${sub.next}`" : ""}

`;
};
