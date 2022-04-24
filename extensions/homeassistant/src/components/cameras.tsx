import { Color, Detail, getPreferenceValues, Icon, showToast, Action, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCacheFilepath } from "../cache";
import { ha } from "../common";
import { State } from "../haapi";
import { getErrorMessage } from "../utils";
import afs from "fs/promises";

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
  return <Detail markdown={md} isLoading={isLoading} />;
}

export function CameraShowImage(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const ep = s.attributes.entity_picture;
  if (!s.entity_id.startsWith("camera") || !ep) {
    return null;
  }
  return (
    <Action.Push
      title="Show Image"
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      icon={{ source: Icon.Eye, tintColor: Color.PrimaryText }}
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
} {
  const [localFilepath, setLocalFilepath] = useState<string | undefined>(defaultIcon);
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

  return { localFilepath, error, isLoading };
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
