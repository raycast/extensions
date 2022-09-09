import { ActionPanel, List, Action } from "@raycast/api";
import { useEffect, useState } from "react";

import mp from "multipass-control";

function iconForState(state: string) {
  if (state == "Running") {
    return "🟢";
  }
  if (state == "Stopped") {
    return "⚫️";
  }
  if (state == "Suspended") {
    return "⚪️";
  }
  return "🟡";
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

  useEffect(() => {
    let running = true;
    async function fetchImages() {
      while (running) {
        const { list } = await mp.localImages();
        setImages(list);
      }
    }
    fetchImages();
    return () => {
      running = false;
    };
  }, []);

  return (
    <List>
      {images.map((image) => (
        <List.Item
          key={image.name}
          title={`${iconForState(image.state)}  ${image.name}`}
          actions={
            <ActionPanel>
              <Action
                title="Start or stop"
                onAction={() => {
                  primaryAction(image.name, image.state);
                }}
              />
              <Action title="Suspend" onAction={() => secondaryAction(image.name, image.state)} />
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}
