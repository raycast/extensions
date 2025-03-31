import { ActionPanel, Action, List } from "@raycast/api";

const allSites = [
  {
    title: "Finance",
    sites: [
      {
        name: "Leumi",
        icon: "https://hb2.bankleumi.co.il/staticcontent/gate-keeper/favicon/apple-touch-icon.png",
        url: "https://hb2.bankleumi.co.il/staticcontent/gate-keeper/he/",
      },
    ],
  },
  {
    title: "Social",
    sites: [
      {
        name: "Linkdin",
        icon: "https://static.licdn.com/aero-v1/sc/h/3loy7tajf3n0cho89wgg0fjre",
        url: "https://www.linkedin.com/feed/",
      },
      {
        name: "Facebook",
        icon: "https://static.xx.fbcdn.net/rsrc.php/y1/r/ay1hV6OlegS.ico",
        url: "https://www.facebook.com/",
      },
      {
        name: "Instegram",
        icon: "https://static.cdninstagram.com/rsrc.php/y4/r/QaBlI0OZiks.ico",
        url: "https://www.instagram.com/",
      },
    ],
  },
];

export default function Command() {
  return (
    <List navigationTitle="Open Pull Requests">
      {allSites.map((category) => {
        return (
          <List.Item
            title={category.title}
            actions={
              <ActionPanel title="Finance">
                {category.sites.map(({ icon, name, url }) => {
                  return <Action.OpenInBrowser url={url} icon={{ source: icon }} title={name} />;
                })}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
