import { today } from "@/common/utils/date-utils";
import { Appearance, getSchedulePalette } from "@/common/colors";

interface CurrentTimeMarkerProps {
  index: number;
  appearance: Appearance;
}

export function CurrentTimeMarker({ index, appearance }: CurrentTimeMarkerProps) {
  const fraction = (today().getHours() * 60 + today().getMinutes()) / (24 * 60);
  const leftPercent = ((index + fraction) / 7) * 100;
  const palette = getSchedulePalette(appearance);

  return (
    <div
      tw={`flex absolute left-[${leftPercent}%] top-[30px] w-[4px] h-[63}px] bg-[${palette.marker}] rounded-[2px]`}
      style={{ opacity: 0.75 }}
    />
  );
}
