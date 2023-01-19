import {
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  showToast,
  Action,
  Toast,
  List,
  Grid,
  ActionPanel,
  Image,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getCacheFilepath } from "../cache";
import { ha } from "../common";
import { State } from "../haapi";
import { getErrorMessage, getFriendlyName } from "../utils";
import afs from "fs/promises";
import { useHAStates } from "../hooks";
import { useStateSearch } from "./states";
import { EntityStandardActionSections } from "./entity";
import fs from "fs";

function CameraImage(props: { state: State }): JSX.Element {
  const s = props.state;
  const { localFilepath, isLoading, error } = useImage(s.entity_id);
  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Could not fetch image",
      message: error,
    });
  }
  let md = `# ${s.attributes.friendly_name || s.entity_id}`;
  if (localFilepath) {
    md += `\n![Camera](${localFilepath})`;
  }
  return (
    <Detail
      markdown={md}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Video Stream">
            <CameraOpenStreamInBrowserAction state={s} />
            <CameraOpenStreamInVLCAction state={s} />
            <CameraOpenStreamInIINAAction state={s} />
          </ActionPanel.Section>
          <EntityStandardActionSections state={s} />
        </ActionPanel>
      }
    />
  );
}

export function CameraShowImage(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const ep = s.attributes.entity_picture;
  if (!s.entity_id.startsWith("camera") || !ep) {
    return null;
  }
  return (
    <Action.Push
      title="Show Image Detail"
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
      target={<CameraImage state={s} />}
    />
  );
}

export function CameraTurnOnAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("camera", "turn_on", { entity_id: s.entity_id });
  };
  return (
    <Action
      title="Turn On"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      icon={{ source: "power-btn.png", tintColor: Color.Green }}
    />
  );
}

export function CameraTurnOffAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("camera", "turn_off", { entity_id: s.entity_id });
  };
  return (
    <Action
      title="Turn Off"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      icon={{ source: "power-btn.png", tintColor: Color.Red }}
    />
  );
}

function getVideoStreamUrlFromCamera(state: State): string | undefined {
  const access_token = state.attributes.access_token as string | undefined;
  if (!access_token) {
    return;
  }
  const url = ha.urlJoin(`api/camera_proxy_stream/${state.entity_id}?token=${access_token}`);
  return url;
}

export function CameraOpenStreamInBrowserAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const url = getVideoStreamUrlFromCamera(s);
  if (!url) {
    return null;
  }
  return <Action.OpenInBrowser title="Open in Browser" shortcut={{ modifiers: ["cmd"], key: "b" }} url={url} />;
}

export function CameraOpenStreamInVLCAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const appPath = "/Applications/VLC.app";
  if (!fs.existsSync(appPath)) {
    return null;
  }

  const url = getVideoStreamUrlFromCamera(s);
  if (!url) {
    return null;
  }
  return (
    <Action.Open
      title="Open in VLC"
      target={url}
      application="VLC"
      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      icon={{ fileIcon: appPath }}
    />
  );
}

export function CameraOpenStreamInIINAAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const appPath = "/Applications/IINA.app";
  if (!fs.existsSync(appPath)) {
    return null;
  }

  const url = getVideoStreamUrlFromCamera(s);
  if (!url) {
    return null;
  }
  return (
    <Action.Open
      title="Open in IINA"
      target={url}
      application="IINA"
      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      icon={{ fileIcon: appPath }}
    />
  );
}

async function fileToBase64Image(filename: string): Promise<string> {
  const buff = await afs.readFile(filename);
  const base64data = buff.toString("base64");
  return `data:image/jpeg;base64,${base64data}`;
}

export function useImage(
  entityID: string,
  defaultIcon?: string
): {
  localFilepath?: string;
  error?: string;
  isLoading: boolean;
  imageFilepath?: string;
} {
  const [localFilepath, setLocalFilepath] = useState<string | undefined>(defaultIcon);
  const [imageFilepath, setImageFilepath] = useState<string | undefined>(defaultIcon);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const localFilepath = await getCacheFilepath(`img_${entityID}.png`, true);
        await ha.getCameraProxyURL(entityID, localFilepath);
        const base64Img = await fileToBase64Image(localFilepath);
        if (!didUnmount) {
          const interval = getCameraRefreshInterval();
          if (interval && interval > 0) {
            setTimeout(fetchData, interval);
          }
          setLocalFilepath(base64Img);
          setImageFilepath(localFilepath);
        }
      } catch (error) {
        if (!didUnmount) {
          setError(getErrorMessage(error));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [entityID]);

  return { localFilepath, error, isLoading, imageFilepath };
}

const defaultRefreshInterval = 3000;

export function getCameraRefreshInterval(): number | null {
  const preferences = getPreferenceValues();
  const userValue = preferences.camerarefreshinterval as string;
  if (!userValue || userValue.length <= 0) {
    return defaultRefreshInterval;
  }
  const msec = parseFloat(userValue);
  if (Number.isNaN(msec)) {
    console.log(`invalid value ${userValue}, fallback to null`);
    return null;
  }
  if (msec < 1) {
    return null;
  } else {
    return msec;
  }
}

function CameraGridItem(props: { state: State }): JSX.Element {
  const s = props.state;
  const { localFilepath, imageFilepath } = useImage(s.entity_id);
  const content: Image.ImageLike =
    s.state === "unavailable" ? { source: "video.png", tintColor: Color.Blue } : { source: localFilepath || "" };
  const titleParts = [getFriendlyName(s)];
  if (s.state === "unavailable") {
    titleParts.push("❌");
  }
  return (
    <Grid.Item
      content={content}
      title={titleParts.join(" ")}
      quickLook={imageFilepath ? { name: getFriendlyName(s), path: imageFilepath } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Controls">
            <CameraShowImage state={s} />
            {imageFilepath && <Action.ToggleQuickLook />}
          </ActionPanel.Section>
          <ActionPanel.Section title="Video Stream">
            <CameraOpenStreamInBrowserAction state={s} />
            <CameraOpenStreamInVLCAction state={s} />
            <CameraOpenStreamInIINAAction state={s} />
          </ActionPanel.Section>
          <EntityStandardActionSections state={s} />
        </ActionPanel>
      }
    />
  );
}

export function CameraGrid(): JSX.Element {
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useStateSearch(undefined, "camera", "", allStates);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot get Home Assistant Cameras",
      message: error.message,
    });
  }

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <Grid
      searchBarPlaceholder="Filter by Name"
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      columns={3}
      fit={Grid.Fit.Fill}
    >
      {states?.map((s) => (
        <CameraGridItem key={s.entity_id} state={s} />
      ))}
    </Grid>
  );
}
