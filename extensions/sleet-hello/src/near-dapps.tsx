import { ActionPanel, Action, List } from "@raycast/api";

interface DApp {
  title: string;
  url: string;
  description: string;
  icon?: string;
}

const dapps: DApp[] = [
  {
    title: "OnSocial",
    url: "https://onsocial.id/",
    description: "Social platform on NEAR",
    icon: "web_globe_icon.png",
  },
  {
    title: "Meme Cooking",
    url: "https://meme.cooking/?referral=sleet.near",
    description: "Meme tokens on NEAR",
    icon: "meme-cooking.png",
  },
  {
    title: "Pumpopoly",
    url: "https://near.pumpopoly.com/?invite=sleet.near",
    description: "Virtual Real Estate Crypto Game on NEAR",
    icon: "web_globe_icon.png",
  },
  {
    title: "Rhea Finance",
    url: "https://dex.rhea.finance/points?code=zmDT0oI",
    description: "DEX on NEAR",
    icon: "web_globe_icon.png",
  },
  {
    title: "Namesky",
    url: "https://namesky.app/",
    description: "Account Marketplace on NEAR",
    icon: "web_globe_icon.png",
  },
  {
    title: "Meteor Wallet",
    url: "https://wallet.meteorwallet.app/wallet",
    description: "Web wallet for NEAR Protocol",
    icon: "web_globe_icon.png",
  },
];

export default function Command() {
  return (
    <List>
      {dapps.map((dapp) => (
        <List.Item
          key={dapp.url}
          icon={dapp.icon}
          title={dapp.title}
          subtitle={dapp.description}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={dapp.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
