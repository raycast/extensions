import { List, Icon, showHUD } from "@raycast/api";
import fetch from "node-fetch";
import { SeedrModelInterface, SeedrTorrent, SeedrFolder, SeedrFile } from "./types";
import { useEffect, useState } from "react";
import { bytesToSize, getCookie, getTimestamp, stringToDate } from "./utils";

async function fetchTorrents(cookie: string): Promise<SeedrModelInterface> {
  const timestamp = getTimestamp();
  const url = `https://www.seedr.cc/fs/folder/0/items?timestamp=${timestamp}`;

  const headers = {
    authority: "www.seedr.cc",
    accept: "application/json",
    cookie: "RSESS_remember=" + cookie,
    referer: "https://www.seedr.cc/files",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Error fetching seeds: ${response.statusText}`);
    }
    const json = await response.json();
    console.log(json);
    return json as SeedrModelInterface;
  } catch (error) {
    console.error("Error fetching seeds:", error);
    throw error;
  }
}

export default function Command() {
  const [seeds, setSeeds] = useState<SeedrModelInterface>({
    space_max: 0,
    space_used: 0,
    saw_walkthrough: 0,
    id: 0,
    timestamp: "",
    path: "",
    parent: -1,
    folders: [],
    files: [],
    torrents: [],
  });
  const [loading, setLoading] = useState(true);
  const cookie = getCookie();

  useEffect(() => {
    if (!cookie) {
      console.error("SEEDR_COOKIE is not set");
      showHUD("Error: cookie is not set");
      return;
    }

    fetchTorrents(cookie)
      .then((seeds) => {
        setSeeds(seeds);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  return (
    <List isLoading={loading}>
      {seeds.torrents.length > 0 && (
        <List.Section title="Seeds">
          {seeds.torrents.map((seed) => (
            <SingleSeedrItem key={seed.id} {...seed} />
          ))}
        </List.Section>
      )}
      {seeds.folders.length > 0 && (
        <List.Section title="Folders">
          {seeds.folders.map((folder) => (
            <SingleSeedrFolder key={folder.id} {...folder} />
          ))}
        </List.Section>
      )}
      {seeds.files.length > 0 && (
        <List.Section title="Files">
          {seeds.files.map((file) => (
            <SingleSeedrFile key={file.id} {...file} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

const SingleSeedrFile = (file: SeedrFile) => {
  const { id, path, size, last_update } = file;
  return <List.Item key={id} title={path} subtitle={`${size} ${last_update}`} />;
};
const SingleSeedrFolder = (folder: SeedrFolder) => {
  const { id, path, size, last_update } = folder;
  return (
    <List.Item
      key={id}
      title={path}
      accessories={[
        { date: { value: stringToDate(last_update) }, icon: Icon.Calendar },
        { text: { value: `${bytesToSize(size)}` }, icon: Icon.HardDrive },
      ]}
    />
  );
};

const SingleSeedrItem = (seed: SeedrTorrent) => {
  const { name, size, hash, download_rate, seeders } = seed;
  return (
    <List.Item
      key={hash}
      id={hash}
      title={name}
      accessories={[
        { text: { value: `${bytesToSize(download_rate)}/s` }, icon: Icon.ArrowDown },
        { text: { value: `${seeders}` }, icon: Icon.Person },
        { text: { value: `${bytesToSize(size)}` }, icon: Icon.HardDrive },
      ]}
    />
  );
};
