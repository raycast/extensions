import { Tokens } from "./tokens";

const adjectives = [
  "Diamond",
  "Golden",
  "Platinum",
  "Cosmic",
  "Quantum",
  "Turbo",
  "Mega",
  "Ultra",
  "Legendary",
  "Epic",
];
const nouns = ["Hodler", "Whale", "Moonbag", "Vault", "Stash", "Treasury", "Stack", "Rocket", "Lambo", "Portfolio"];

export const generateRandomAddressName = (token: Tokens, address: string): string => {
  const address_ = `${address.slice(0, 3)}...${address.slice(-3)}`;
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adjective} ${noun} ${token} (${address_})`;
};

export const generateAddressName = (token: Tokens, address: string, name: string): string => {
  const address_ = `${address.slice(0, 3)}...${address.slice(-3)}`;

  return `${name} ${token} (${address_})`;
};
