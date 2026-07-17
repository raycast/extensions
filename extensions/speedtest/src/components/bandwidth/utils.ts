import { ActivitySpeedQuality, InternetSpeedLite } from "./types";

export function convertBitsToMbps(speed: number | undefined): number {
  if (!speed) {
    return 0;
  }

  const bitInByte = 8;
  const byteInKb = 1000;
  const kbInMb = 1000;
  return (speed * bitInByte) / byteInKb / kbInMb;
}

export function speedToAvailableActivityQuality(
  { download, upload }: InternetSpeedLite,
  activity: ActivitySpeedQuality,
) {
  const availableQuality: string[] = [];

  if (!download || !upload) {
    return availableQuality;
  }

  for (const quality in activity) {
    if (download > activity[quality].download! && upload > activity[quality].upload!) {
      availableQuality.push(quality);
    }
  }
  return availableQuality;
}
