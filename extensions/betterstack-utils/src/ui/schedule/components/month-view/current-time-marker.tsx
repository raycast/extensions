import { today } from "@/common/utils/date-utils";

interface CurrentTimeMarkerProps {
  index: number;
}

export function CurrentTimeMarker({ index }: CurrentTimeMarkerProps) {
  const fraction = (today().getHours() * 60 + today().getMinutes()) / (24 * 60);
  const leftPercent = ((index + fraction) / 7) * 100;

  return (
    <div
      tw={`flex absolute left-[${leftPercent}%] top-[30px] w-[4px] h-[63}px] bg-white rounded-[2px]`}
      style={{ opacity: 0.75 }}
    />
  );
}
