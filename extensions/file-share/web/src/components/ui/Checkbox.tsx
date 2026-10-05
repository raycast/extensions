import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "../../lib/cn";

export function Checkbox({
  checked,
  onCheckedChange,
  id,
  label,
  className,
}: {
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  label: string;
  className?: string;
}) {
  return (
    <RadixCheckbox.Root
      id={id}
      checked={checked}
      aria-label={label}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      className={cn(
        "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line bg-background",
        "transition-colors duration-150 hover:border-muted",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-ink",
        "data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-accent-ink",
        className,
      )}
    >
      <RadixCheckbox.Indicator>
        {checked === "indeterminate" ? (
          <Minus size={12} strokeWidth={3} />
        ) : (
          <Check size={12} strokeWidth={3} />
        )}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
