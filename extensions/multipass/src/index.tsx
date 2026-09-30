import { ActionPanel, List, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import { useEffect, useState, Fragment } from "react";
import mp from "multipass-control";

function iconForState(state: string) {
  if (state == "Running") {
    return { source: Icon.CircleFilled, tintColor: Color.Green };
  }
  if (state == "Stopped") {
    return { source: Icon.CircleFilled, tintColor: Color.Red };
  }
  if (state == "Suspended") {
    return { source: Icon.CircleFilled, tintColor: Color.Yellow };
  }
  return { source: Icon.CircleFilled, tintColor: Color.Purple };
}

async function primaryAction(name: string, state: string) {
  if (state == "Running") {
    return await mp.stopImage(name);
  }
  if (state == "Stopped") {
    return await mp.startImage(name);
  }
  if (state == "Suspended") {
    return await mp.startImage(name);
  }
}

async function secondaryAction(name: string, state: string) {
  if (state == "Running") {
    return await mp.suspendImage(name);
  }
}

interface MultipassImage {
  name: string;
  state: string;
}

export default function Command() {
  const [images, setImages] = useState<Array<MultipassImage>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let running = true;
    async function fetchImages() {
      while (running) {
        try {
          const { list } = await mp.localImages();
          setImages(list);
        } catch (e) {
          await showToast(Toast.Style.Failure, "Error", "Failed to fetch images");
          running = false;
        } finally {
          setIsLoading(false);
        }
      }
    }
    fetchImages();
    return () => {
      running = false;
      setIsLoading(false);
    };
  }, []);

  return (
    <List isLoading={isLoading}>
      {images.map((image) => (
        <List.Item
          key={image.name}
          subtitle={image.state}
          icon={iconForState(image.state)}
          title={image.name}
          actions={
            <ActionPanel>
              {["Suspended", "Stopped"].includes(image.state) && (
                <Action
                  title="Start Instance"
                  icon={Icon.Play}
                  onAction={() => {
                    primaryAction(image.name, image.state);
                  }}
                />
              )}

              {image.state == "Running" && (
                <Fragment>
                  <Action
                    title="Stop Instance"
                    icon={Icon.Stop}
                    onAction={() => {
                      primaryAction(image.name, image.state);
                    }}
                  />
                  <Action title="Suspend" icon={Icon.Power} onAction={() => secondaryAction(image.name, image.state)} />
                </Fragment>
              )}
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}
