import { Colors } from "@/common/colors";

interface OnCallPillProps {
  name: string;
  color: string;
}

export function OnCallUserPill({ name, color }: OnCallPillProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div tw="flex items-center h-[50px] pl-[12px] pt-[20px]">
      <div tw={`flex items-center justify-center w-[32px] h-[32px] rounded-full bg-[${color}]`}>
        <span tw={`text-[15px] font-bold text-[${Colors.DARK}]`}>{initial}</span>
      </div>
      <span tw="text-[20px] pl-4 font-bold text-white">{`${name} is on-call`}</span>
    </div>
  );
}
