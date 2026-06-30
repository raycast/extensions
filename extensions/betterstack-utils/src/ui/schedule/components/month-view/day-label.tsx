import { formatWeekday } from "@/common/utils/date-utils";

export function DayLabel(props: { date: Date }) {
  return (
    <>
      <div tw={`flex absolute left-0 top-0 w-px h-[93px] bg-dim`} style={{ opacity: 0.3 }} />
      <div tw="flex absolute left-0 top-[30px] right-0 h-px bg-slate" />
      <div tw="flex items-center justify-center w-full h-[30px]">
        <span tw="text-[14px] font-semibold text-dim">{formatWeekday(props.date)}</span>
        <div tw="flex w-[8px]" />
        <span tw="text-[14px] font-semibold text-subtle">{props.date.getDate()}</span>
      </div>
    </>
  );
}
