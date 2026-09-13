import { mailtoUrl, telUrl } from "./telephone";

export type ContactActionKind = "call-pro" | "call-mobile" | "email" | "open";

export type ContactReach = {
  phonePro: string | null;
  phoneMobile: string | null;
  email: string | null;
};

/**
 * The order actions appear in, most useful first — the first entry takes Enter, the second Cmd+Enter.
 * An action pointing at a missing field is never offered, so a landline-only contact dials on Enter
 * instead of leaving a dead key. "open" always terminates the list: the panel is never empty.
 */
export function contactActionOrder(contact: ContactReach): ContactActionKind[] {
  const order: ContactActionKind[] = [];
  if (telUrl(contact.phonePro) !== null) order.push("call-pro");
  if (telUrl(contact.phoneMobile) !== null) order.push("call-mobile");
  if (mailtoUrl(contact.email) !== null) order.push("email");
  order.push("open");
  return order;
}
