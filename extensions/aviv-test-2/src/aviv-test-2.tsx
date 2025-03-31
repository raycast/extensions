import { ActionPanel, Action, List, showToast, ToastStyle, Form, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

const initialSites = [
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
        name: "LinkedIn",
        icon: "https://static.licdn.com/aero-v1/sc/h/3loy7tajf3n0cho89wgg0fjre",
        url: "https://www.linkedin.com/feed/",
      },
      {
        name: "Facebook",
        icon: "https://static.xx.fbcdn.net/rsrc.php/y1/r/ay1hV6OlegS.ico",
        url: "https://www.facebook.com/",
      },
      {
        name: "Instagram",
        icon: "https://static.cdninstagram.com/rsrc.php/y4/r/QaBlI0OZiks.ico",
        url: "https://www.instagram.com/",
      },
    ],
  },
];

export default function Command() {
  const [allSites, setAllSites] = useState(initialSites);

  // Load sites from LocalStorage on component mount
  useEffect(() => {
    const loadSites = async () => {
      const storedSites = await LocalStorage.getItem("allSites");
      if (storedSites) {
        setAllSites(JSON.parse(storedSites.toString()));
      }
    };
    loadSites();
  }, []);

  // Save sites to LocalStorage whenever they change
  useEffect(() => {
    const saveSites = async () => {
      await LocalStorage.setItem("allSites", JSON.stringify(allSites));
    };
    saveSites();
  }, [allSites]);

  const addSite = (title, name, icon, url) => {
    setAllSites((prevSites) => {
      const updatedSites = [...prevSites];
      const categoryIndex = updatedSites.findIndex((category) => category.title === title);
      if (categoryIndex !== -1) {
        updatedSites[categoryIndex].sites.push({ name, icon, url });
      } else {
        updatedSites.push({ title, sites: [{ name, icon, url }] });
      }
      return updatedSites;
    });
    showToast(ToastStyle.Success, "Site added successfully!");
  };

  const deleteSite = (categoryTitle, siteName) => {
    setAllSites((prevSites) => {
      const updatedSites = prevSites.map((category) => {
        if (category.title === categoryTitle) {
          return {
            ...category,
            sites: category.sites.filter((site) => site.name !== siteName),
          };
        }
        return category;
      });
      return updatedSites;
    });
    showToast(ToastStyle.Success, "Site deleted successfully!");
  };

  return (
    <List navigationTitle="Manage Sites">
      {allSites.map((category) => (
        <List.Section key={category.title} title={category.title}>
          {category.sites.map(({ icon, name, url }) => (
            <List.Item
              key={name}
              title={name}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={url} icon={{ source: icon }} title="Open" />
                  <Action title="Delete Site" onAction={() => deleteSite(category.title, name)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      <List.Item
        title="Add Site"
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Site"
              target={
                <Form
                  actions={
                    <ActionPanel>
                      <Action.SubmitForm
                        title="Add"
                        onSubmit={(values) => {
                          addSite(values.category, values.name, values.icon, values.url);
                        }}
                      />
                    </ActionPanel>
                  }
                >
                  <Form.TextField id="category" title="Category" placeholder="Enter category" />
                  <Form.TextField id="name" title="Site Name" placeholder="Enter site name" />
                  <Form.TextField id="icon" title="Icon URL" placeholder="Enter icon URL" />
                  <Form.TextField id="url" title="Site URL" placeholder="Enter site URL" />
                </Form>
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
