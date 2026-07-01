import { cn } from "@/lib/utils";
import { formatMonth } from "@/common/utils/date-utils";
import { OnCallSummary } from "@/domain/on-call-summary";

interface SummaryBlockProps {
  year: number;
  month: number;
  summary: OnCallSummary;
  backgroundColor: string;
}

export function SummaryBlock({ year, month, summary, backgroundColor }: SummaryBlockProps) {
  if (summary.length === 0) return null;

  const monthLabel = formatMonth({ year, month });
  const [monthName, yearLabel] = monthLabel.split(" ");

  return (
    <div tw={cn("flex w-[1160px] rounded-[10px] border-[0.5px] overflow-hidden mt-6", backgroundColor)}>
      <div tw="flex w-[478px] py-[14px]">
        <div tw="flex w-[330px]" />
        <div tw="flex flex-col flex-1 justify-center items-center">
          <span tw="text-[18px] font-bold text-frost">{monthName}</span>
          <span tw="text-[18px] font-bold text-frost mt-3">{yearLabel}</span>
        </div>
      </div>
      <div tw="flex py-[14px]">
        <div tw="flex flex-col">
          {summary.map(({ teamMember, email, color }, index) => (
            <div key={index} tw="flex items-center h-[36px] pl-[24px]">
              <div tw={`flex w-[12px] h-[12px] rounded-full bg-[${color}] mr-[10px]`} />
              <span tw="text-[18px] font-semibold text-subtle">{`${teamMember} - ${email}`}</span>
            </div>
          ))}
        </div>
        <div tw="flex flex-col">
          {summary.map(({ hours }, index) => (
            <div key={index} tw="flex items-center justify-end h-[36px] pl-[20px]">
              <span tw="text-[18px] font-semibold text-subtle">{formatDaysHours(hours)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDaysHours(totalHours: number): string {
  const days = Math.floor(totalHours / 24);
  const hours = Math.round(totalHours % 24);
  if (days > 0 && hours > 0) return `${days}d ${hours}h`;
  if (days > 0) return `${days}d`;

  return `${hours}h`;
}
