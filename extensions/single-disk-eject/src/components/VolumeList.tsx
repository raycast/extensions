import { useState, useEffect } from "react";
import { List, showToast, Toast, ToastStyle } from "@raycast/api";

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
    const toast = new Toast({ style: ToastStyle.Animated, title: `Ejecting ${volume.name}...` });
    await toast.show();

    try {
      await ejectVolume(volume);
      await toast.hide();
      showToast(ToastStyle.Success, `Successfully Ejected ${volume.name}`);
    } catch (e: any) {
      console.log(">>> Error: ", e.message);
      await toast.hide();
      showToast(ToastStyle.Failure, "Error ejecting volume. Is it in use?");
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
