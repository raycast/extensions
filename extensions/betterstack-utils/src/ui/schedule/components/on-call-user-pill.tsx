import { Appearance, getSchedulePalette, getThemeColor } from "@/common/colors";

interface OnCallPillProps {
  name: string;
  color: string;
  appearance: Appearance;
}

export function OnCallUserPill({ name, color, appearance }: OnCallPillProps) {
  const initial = name.charAt(0).toUpperCase();
  const themeColor = getThemeColor(color);
  const palette = getSchedulePalette(appearance);

  return (
    <div tw="flex items-center h-[50px] pl-[12px] pt-[20px]">
      <div tw={`flex items-center justify-center w-[32px] h-[32px] rounded-full bg-[${color}]`}>
        <span tw={`text-[15px] font-bold text-[${themeColor}]`}>{initial}</span>
      </div>
      <span tw={`text-[20px] pl-4 font-bold text-[${palette.heading}]`}>{`${name} is on-call`}</span>
    </div>
  );
}
