interface CurrentTimeMarkerProps {
  markerTime: number;
}

export function CurrentTimeMarker({ markerTime }: CurrentTimeMarkerProps) {
  const topPercent = markerTime * 100 - 2;

  return (
    <div
      tw={`flex absolute left-[4px] right-[4px] top-[${topPercent}%] h-[4px] bg-white rounded-[2px]`}
      style={{ opacity: 0.75 }}
    />
  );
}
