import { ActionPanel, Action, List, Detail, Icon } from "@raycast/api";
// import { showToast, Toast } from "@raycast/api";
import { closeMainWindow, popToRoot } from "@raycast/api";
import { Cache } from "@raycast/api";
import { inspect } from "util";
import { useEffect, useState } from "react";
import { getExpressoInfo, runExpressoDisconnect, runExpressoConnect } from "./lib/expresso";
import { hasCLI, downloadCLI } from "./lib/cli";

export function updateCache(favorites: any[], locations: any[]) {

  const cache = new Cache();
  cache.set("favorites", JSON.stringify(favorites));
  cache.set("locations", JSON.stringify(locations));
}

export function getFromCacheFavorites(): any[] {

  const cache = new Cache();

  let val = [];
  if(cache.has("favorites")) {
    const cache_val = cache.get("favorites");
    val = JSON.parse(cache_val || "");
  }

  return val;
}

export function getFromCacheLocations() {

  const cache = new Cache();

  let val = [];
  if(cache.has("locations")) {
    const cache_val = cache.get("locations");
    val = JSON.parse(cache_val || "");
  }

  return val;
}

export async function connectVPN(uid: number, title: string) {

  // TODO: Currently toast is not displayed due to the
  // pop to root call
  // const toast = await showToast({
  //   style: Toast.Style.Animated,
  //   title: `Connecting to ${title}...`,
  // });

  console.log(`Closing window`);
  closeMainWindow({ clearRootSearch: true });

  // Pop to root to ensure user doesn't stay on the same screen with
  // outdated info.
  // Forces user to reload the command and status.
  popToRoot({ clearSearchBar: true });

  console.log(`Connect requested uid: ${uid}`);
  try {
    await runExpressoConnect(uid);
  } catch (error) {
    // toast.style = Toast.Style.Failure;
    // toast.title = "Failed to connect!";
    return;
  }

  // toast.style = Toast.Style.Success;
  // toast.title = "Connected!";
}

export async function disconnectVPN(title: string) {
  // const toast = await showToast({
  //   style: Toast.Style.Animated,
  //   title: `Disconnecting from ${title}...`,
  // });

  console.log(`Closing window`);
  closeMainWindow({ clearRootSearch: false });

  // Pop to root to ensure user doesn't stay on the same screen with
  // outdated info.
  // Forces user to reload the command and status.
  popToRoot({ clearSearchBar: true });

  console.log(`Disconnect requested`);
  try {
    await runExpressoDisconnect();
  } catch (error) {
    // toast.style = Toast.Style.Failure;
    // toast.title = "Failed to disconnect!";
    return;
  }

  // toast.style = Toast.Style.Success;
  // toast.title = "Disconnected!";
}

export function getAccessoriesForLocation(location: any) {

  if(location.is_connected) {
    return [
      { icon: Icon.CircleFilled, tooltip: "Currently Connected" },
    ]
  } else if(location.is_recent) {
    return [
      { icon: Icon.Clock, tooltip: "Recently connected" },
    ]
  } else if(location.is_favorite) {
    return [
      { icon: Icon.Star, tooltip: "Favorited" },
    ]
  } else if(location.is_recommended) {
    return [
      { icon: Icon.Trophy, tooltip: "Recommended" },
    ]
  } else {
    return [];
  }
}

export function getListItemForLocation(location: any,
                                       key_prefix: string,
                                       key_index: number) {

  return <List.Item
    title={location.title}
    icon={location.icon.path}
    keywords={location.keywords}
    key={key_prefix + key_index}
    accessories={getAccessoriesForLocation(location)}
    actions={
      <ActionPanel>
        <Action
          title={"Connect to " + location.title}
          onAction={() => connectVPN(location.uid, location.title)}
        />
      </ActionPanel>
    }
  />;
}

export function getListItemForStatus(status: any) {

  if(status === undefined) {
    status = {
        status: true,
        status_text: "Loading...",
        status_detail: undefined,
        last_used: undefined,
    }
  }

  // Status action
  let status_action;

  if(status.status == true) {
    status_action = <Action
      title={"Disconnect"}
      onAction={() => {
          disconnectVPN(status.status_detail);
      }}
    />;
  } else if(status.status == false &&
            status.last_used != undefined)
  {
    status_action = <Action
      title={"Reconnect to " + status.last_used.title}
      onAction={() =>
        connectVPN(status.last_used.uid, status.last_used.title)
      }
    />;
  } else {
    status_action = undefined;
  }

  let statusItem = <List.Item
    title={status.status_text}
    subtitle={status.status_detail}
    icon="express-vpn-icon.png"
    key="status_row"
    actions={
      <ActionPanel children={status_action}/>
    }
  />

    return statusItem;
}

export function createList(status: any, favorites: any, locations: any) {
  console.log("In createList with... ");
  console.log("Status: " + inspect(status));
  console.log("Favorites: " + inspect(favorites));
  console.log("Locations: " + inspect(locations));

  let isLoading = false;
  if(status === undefined) {
    isLoading = true;
  }

  let sections = [];

  // Status Section
  sections.push(
    <List.Section title="Status" key="status_section">
      {getListItemForStatus(status)}
    </List.Section>
  );

  // Favorites Section
  if(favorites != undefined &&
     favorites.length > 0)
  {
    sections.push(
      <List.Section title="Favorites & Recents" key="favorites_section">
        {favorites.map((item: any, index: number) => (
          getListItemForLocation(item, "favorites_", index)
        ))}
      </List.Section>
    );
  }

  // All Locations
  if(locations != undefined &&
    Object.keys(locations).length > 0)
  {
    Object.entries(locations).forEach(([key, value]: [string, any]) => {
      sections.push(
        <List.Section title={key} key={key}>
          {value.map((item: any, index: number) => (
            getListItemForLocation(item, "location_", index)

          ))}
        </List.Section>
      )
    });
  }

  let rc_list = (<List
    isLoading={isLoading}
    searchBarPlaceholder="Search VPNs"
    children={sections}
  />);


  return rc_list;
}

export function createListCLIDL(): JSX.Element {
  console.log("In createListCLIDL with... ");

  return (
    <List isLoading={true} >
      <List.Item
        title="Downloading helper application..."
        icon="express-vpn-icon.png"
        key="download"
      />
    </List>
  );
}

export default function Command() {
  const [status, setStatus] = useState<any[]>();
  const [favorites, setFavorites] = useState<any[]>();
  const [locations, setLocations] = useState<any[]>();

  const [error, setError] = useState<Error>();
  const [dlFinished, setDlFinished] = useState<boolean>();

  useEffect(() => {
    async function initAsync() {
      if(hasCLI() === false) {
        console.log("Download CLI");

        try {
          await downloadCLI();
        } catch (error: any) {
          console.log("Caught error: " + error);
          setError(error);
        }

        setDlFinished(true);
      }

      console.log("Getting ExpressoInfo");
      const info = await getExpressoInfo();
      setStatus(info.status);
      setFavorites(info.favorites);
      setLocations(info.locations);
      updateCache(info.favorites, info.locations);
    }

    initAsync();
  }, []);

  if(error) {
    console.log("Showing CLI DL Error view... ");
    return <Detail
      markdown={"# Could not download helper tool\n" + error.message}
    />;
  }

  if(hasCLI() === false && dlFinished !== true) {
    console.log("Showing CLI DL view... ");

    return createListCLIDL();
  }

  if(favorites === undefined) {
    setFavorites(getFromCacheFavorites());
  }

  if(locations === undefined) {
    setLocations(getFromCacheLocations());
  }

  console.log("Showing final view... ");
  return createList(
    status,
    favorites,
    locations
  );
}
