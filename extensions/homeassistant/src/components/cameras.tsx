import { ActionPanel, Color, Detail, Icon, PushAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCacheFilepath } from "../cache";
import { ha } from "../common";
import { State } from "../haapi";
import { getErrorMessage } from "../utils";
import afs from "fs/promises";

function CameraImage(props: { state: State }): JSX.Element {
  const s = props.state;
  const ep = s.attributes.entity_picture;
  const { localFilepath, isLoading, error } = useImage(s.entity_id);
  if (error) {
    showToast(ToastStyle.Failure, "Could not fetch image", error);
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
    <PushAction
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
    <ActionPanel.Item
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
    <ActionPanel.Item
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
          setTimeout(fetchData, 3000);
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
