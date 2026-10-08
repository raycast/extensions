import { useState, useEffect } from "react";
import { List, showToast, Toast } from "@raycast/api";

import { Volume } from "../types";
import { listVolumes, ejectVolume } from "../utils";
import VolumeListItem from "./VolumeListItem";

export default function VolumeList() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchVolumes() {
    setIsLoading(true);
    setVolumes(await listVolumes());
    setIsLoading(false);
  }

  async function eject(volume: Volume): Promise<void> {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Ejecting ${volume.name}...` });

    try {
      await ejectVolume(volume);
      await toast.hide();
      await showToast({ style: Toast.Style.Success, title: `Successfully Ejected ${volume.name}` });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.log(">>> Error: ", error.message);
      await toast.hide();
      await showToast({ style: Toast.Style.Failure, title: "Error ejecting volume. Is it in use?" });
    }

    await fetchVolumes();
  }

  useEffect(() => {
    fetchVolumes();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter Volumes By Name...">
      {volumes.map((volume) => (
        <VolumeListItem key={volume.name} volume={volume} eject={eject} />
      ))}
    </List>
  );
}
