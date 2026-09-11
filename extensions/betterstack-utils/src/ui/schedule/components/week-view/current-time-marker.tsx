import { Appearance, getSchedulePalette } from "@/common/colors";

interface CurrentTimeMarkerProps {
  markerTime: number;
  appearance: Appearance;
}

export function CurrentTimeMarker({ markerTime, appearance }: CurrentTimeMarkerProps) {
  const topPercent = markerTime * 100 - 2;
  const palette = getSchedulePalette(appearance);

  return (
    <div
      tw={`flex absolute left-[4px] right-[4px] top-[${topPercent}%] h-[4px] bg-[${palette.marker}] rounded-[2px]`}
      style={{ opacity: 0.75 }}
    />
  );
}
