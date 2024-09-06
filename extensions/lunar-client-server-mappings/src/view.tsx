import { ActionPanel, Action, Icon, List, showToast, getPreferenceValues, openExtensionPreferences, Detail, Toast, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import fs from "fs";
import path from "path";

interface TOSAccept {
  termsAccepted: boolean;
}

type Socials = {
  twitter: string;
  discord: string;
  youtube: string;
  instagram: string;
  twitch: string;
  telegram: string;
  reddit: string;
  tiktok: string;
  facebook: string;
};

type Modpack = {
  id: string;
  promptBeforeGameJoin: boolean;
  promptBeforeLauncherJoin: boolean;
};

type Images = {
  logo: string;
  background: string;
  banner: string;
  wordmark: string;
};

type Server = {
  id: string;
  name: string;
  description: string;
  addresses: string[];
  primaryAddress: string;
  gameTypes: string[];
  primaryColor: string;
  secondaryColor: string;

  minecraftVersions?: string[];
  primaryMinecraftVersion?: string;
  languages?: string[];
  primaryLanguage?: string;
  regions?: string[];
  primaryRegion?: string;

  website?: string;
  store?: string;
  merch?: string;
  wiki?: string;
  
  socials?: Socials;
  modpack?: Modpack;

  inactive?: boolean;
  enriched?: boolean;
  images?: Images;
};

const CACHE_FILE = path.join(__dirname, "cache.json");
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day

async function fetchData(): Promise<Server[]> {
  try {
    const response = await axios.get("https://servermappings.lunarclientcdn.com/servers.json");
    return response.data;
  } catch (error) {
    showToast(Toast.Style.Failure, "Failed to fetch data");
    return [];
  }
}

function cacheData(data: unknown) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ data, timestamp: Date.now() }));
}

function getCachedData(): Server[] | null {
  if (fs.existsSync(CACHE_FILE)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    if (Date.now() - cache.timestamp < CACHE_DURATION) {
      return cache.data;
    }
  }
  return null;
}

const TagListComp = ({ title, primaryItem, items, server }: { title: string; primaryItem?: string; items?: string[]; server: Server }) => {
  if (!primaryItem && (!items || items.length === 0)) return null;
  return (
    <List.Item.Detail.Metadata.TagList title={title}>
      {primaryItem && (
        <List.Item.Detail.Metadata.TagList.Item
          text={primaryItem}
          color={server.primaryColor === "#FFFFFF" ? server.secondaryColor : server.primaryColor}
        />
      )}
      {items?.map((item) => {
        if (item !== primaryItem) {
          return (
            <List.Item.Detail.Metadata.TagList.Item key={item} text={item} />
          );
        }
        return null;
      })}
    </List.Item.Detail.Metadata.TagList>
  );
};


const LinkComp = ({ title, link }: { title: string; link?: string }) => {
  if (!link) return null;
  return <List.Item.Detail.Metadata.Link title={title} target={link} text={link} />;
};


export default function Command() {
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const checkTermsAcceptance = () => {
      const accepted = getPreferenceValues<TOSAccept>();
      setTermsAccepted(accepted.termsAccepted === true);
    };
    checkTermsAcceptance();
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      let data = getCachedData();
      if (!data) {
        data = await fetchData();
        cacheData(data);
      }
      setServers(data);
      setLoading(false);
    }
    if (termsAccepted) {
      loadData();
    }
  }, [termsAccepted]);

  const refreshData = async () => {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
    const data = await fetchData();
    cacheData(data);
    setServers(data);
    showToast(Toast.Style.Success, "Data refreshed successfully!");
  };

  const copyJson = (server: Server) => {
    const jsonString = JSON.stringify(server, null, 2);
    Clipboard.copy(jsonString).then(() => {
      showToast(Toast.Style.Success, "Server JSON copied to clipboard!");
    }).catch(() => {
      showToast(Toast.Style.Failure, "Failed to copy JSON to clipboard.");
    });
  };

  if (termsAccepted === null) return null;

  return (
    <>
      {termsAccepted ? (
        <List 
        isLoading={loading}
        searchBarPlaceholder="Search servers..."
        isShowingDetail>
          {servers.map((server) => (
            <List.Item
              key={server.id}
              icon={server.images?.logo || Icon.Globe}
              title={server.name}
              actions={
                <ActionPanel>
                  <Action.Open icon={Icon.Play} title="Join the Server" target={`lunarclient://play?serverAddress=${server.primaryAddress}`} />
                  <Action.CopyToClipboard title="Copy Address to Keyboard" content={server.primaryAddress} />
                  <Action shortcut={{ modifiers: ["cmd"], key: "c" }} icon={Icon.Clipboard} title="Copy JSON Response" onAction={() => copyJson(server)} />
                  <Action shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.ArrowClockwise} title="Refresh Data" onAction={refreshData} />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={`${server.images?.logo ? `<img src="${server.images.logo}" width="180"/>` : ""} ${server.images?.background ? `<img src="${server.images.background}"/>` : ""} ${server.images?.banner ? `<img src="${server.images.banner}"/>` : ""} ${server.images?.wordmark ? `<img src="${server.images.wordmark}"/>` : ""}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="ID" text={server.id} />
                      {server.description && (<List.Item.Detail.Metadata.Label title="Description" text={server.description} />)}
                      
                      <TagListComp 
                        title="Addresses" 
                        primaryItem={server.primaryAddress} 
                        items={server.addresses} 
                        server={server} 
                      />
                    
                      <List.Item.Detail.Metadata.TagList title="Game Types">
                        {server.gameTypes.map((gameType) => (
                          <List.Item.Detail.Metadata.TagList.Item text={gameType} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.TagList title="Colors">
                        <List.Item.Detail.Metadata.TagList.Item text={server.primaryColor} color={server.primaryColor} />
                        <List.Item.Detail.Metadata.TagList.Item text={server.secondaryColor} color={server.secondaryColor} />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Separator />

                      <TagListComp 
                        title="Regions" 
                        primaryItem={server.primaryRegion} 
                        items={server.regions} 
                        server={server} 
                      />
                      <TagListComp 
                        title="Minecraft Versions" 
                        primaryItem={server.primaryMinecraftVersion} 
                        items={server.minecraftVersions} 
                        server={server} 
                      />
                      <TagListComp 
                        title="Languages" 
                        primaryItem={server.primaryLanguage} 
                        items={server.languages} 
                        server={server} 
                      />
                      
                      <LinkComp title="Website" link={server.website} />
                      <LinkComp title="Store" link={server.store} />
                      <LinkComp title="Merch" link={server.merch} />
                      <LinkComp title="Wiki" link={server.wiki} />

                      {server.socials && (
                        <List.Item.Detail.Metadata.Separator />
                      )}
                      <LinkComp title="Twitter" link={server.socials?.twitter} />
                      <LinkComp title="Discord" link={server.socials?.discord} />
                      <LinkComp title="YouTube" link={server.socials?.youtube} />
                      <LinkComp title="Instagram" link={server.socials?.instagram} />
                      <LinkComp title="Twitch" link={server.socials?.twitch} />
                      <LinkComp title="Telegram" link={server.socials?.telegram} />
                      <LinkComp title="Reddit" link={server.socials?.reddit} />
                      <LinkComp title="TikTok" link={server.socials?.tiktok} />
                      <LinkComp title="Facebook" link={server.socials?.facebook} />

                      {server.modpack && (
                        <List.Item.Detail.Metadata.Separator />
                      )}
                      {server.modpack?.id && (
                        <List.Item.Detail.Metadata.Label title="Modpack ID" text={server.modpack.id} />
                      )}
                      {server.modpack?.promptBeforeGameJoin && (
                        <List.Item.Detail.Metadata.Label title="Prompt Before Game Join" text="Yes" />
                      )}
                      {server.modpack?.promptBeforeLauncherJoin && (
                        <List.Item.Detail.Metadata.Label title="Prompt Before Launcher Join" text="Yes" />
                      )}

                      {(server.inactive || server.enriched) && (
                        <List.Item.Detail.Metadata.Separator />
                      )}
                      {server.inactive && (<List.Item.Detail.Metadata.Label title="Inactive" text="Yes" />)}
                      {server.enriched && (<List.Item.Detail.Metadata.Label title="Enriched" text="Yes" />)}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
        </List>
      ) : (
        <Detail
        markdown={`You need to accept Lunar Client's [Terms of Service](https://lunarclient.com/terms) to use this extension.`}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
    </>
  );
}