import { List, ActionPanel, Action, Image } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import * as analytics from "./utils/analytics";

interface Network {
  website?: string;
  github?: string;
  twitter?: string;
  twitterImage?: string;
  twitterBanner?: string;
  medium?: string;
  discord?: string;
  telegram?: string;
}

interface SocialMetrics {
  date: number;
  socialActivity: number;
  tweetWithStarknet: number;
  twitterCount: number;
  twitterFollower: number;
}

interface Project {
  id: string;
  name: string;
  shortName: string;
  description: string;
  tags: string[];
  image: string;
  network: Network;
  isLive: boolean;
  isTestnetLive: boolean;
  token?: string;
  technologies?: any;
  socialMetrics?: SocialMetrics;
}

const SELF_PROJECT_ID = "1a37301e-1596-4969-bdc3-77e543da2969";

const getLogo = (project: Project): string => {
  return `https://raw.githubusercontent.com/419Labs/starknet-ecosystem.com/main/public/logos/${project.image}`;
};

const getMarkdown = (project: Project): string => {
  return `<img src="${getLogo(project)}" alt= “” width="50" height="50" align="left">\n
  ## ${project.name}\n
  ${project.description}\n
  ---
  **Mainnet live:** ${project.isLive ? "Yes" : "No"}\n
  **Testnet live:** ${project.isTestnetLive ? "Yes" : "No"}\n
  ---
  **Website:** ${project.network.website}\n
  **Twitter:** ${project.network.twitter}\n
  **Telegram:** ${project.network.telegram}\n
  **Discord:** ${project.network.discord}\n`;
};

export default function Command() {
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listItems, setListItems] = useState<Project[]>([]);

  useEffect(() => {
    analytics.trackEvent("OPEN_STARKNET_ECOSYSTEM");
  }, []);

  useEffect(() => {
    (async () => {
      const response = await axios.get(
        `https://raw.githubusercontent.com/419Labs/starknet-ecosystem.com/main/data/ecosystem.ts`
      );

      const requiredJs = `let allProjects = ${
        response.data.split("export const allProjects: Array<Project> = ")[1]
      }; allProjects;`;
      let allProjects: Project[] = eval(requiredJs);
      allProjects = allProjects.map((project) =>
        project.id === SELF_PROJECT_ID ? { ...project, image: "charged.jpg" } : project
      );
      allProjects.sort((x, y) => (x.id === SELF_PROJECT_ID ? -1 : y.id === SELF_PROJECT_ID ? 1 : 0)); // shamelessly adding ourselves to the front
      setListItems(allProjects);
      setListLoading(false);
    })();
  }, []);

  return (
    <List isShowingDetail isLoading={listLoading}>
      {listItems.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          detail={<List.Item.Detail markdown={getMarkdown(item)} />}
          icon={{ source: getLogo(item), mask: Image.Mask.Circle }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                onOpen={() =>
                  analytics.trackEvent("ECOSYSTEM_PAGE_OPEN", {
                    project: item.name,
                  })
                }
                url={
                  item.network.website ? item.network.website : `https://www.starknet-ecosystem.com/projects/${item.id}`
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
