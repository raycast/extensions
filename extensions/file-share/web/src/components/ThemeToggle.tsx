import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { useTheme, type ThemeChoice } from "../lib/theme";
import { Popover } from "./ui/Popover";

const OPTIONS: Array<{ value: ThemeChoice; label: string; Icon: LucideIcon }> = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

/** Light, dark, or whatever the system says — the default follows the system. */
export function ThemeToggle() {
  const { choice, setChoice } = useTheme();
  const current = OPTIONS.find((option) => option.value === choice) ?? OPTIONS[0];

  return (
    <Popover
      label="Theme"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          id="theme"
          aria-label={`Theme: ${current.label}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={toggle}
          className={cn(
            "grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors duration-150",
            "hover:bg-surface hover:text-ink sm:size-9",
            open && "bg-surface text-ink",
          )}
        >
          <current.Icon size={18} aria-hidden="true" />
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col gap-0.5">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={choice === option.value}
              onClick={() => {
                setChoice(option.value);
                close();
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors duration-150 hover:bg-surface",
                choice === option.value ? "bg-surface text-ink" : "text-muted",
              )}
            >
              <option.Icon size={16} aria-hidden="true" />
              <span className="flex-1">{option.label}</span>
              {choice === option.value ? <Check size={15} className="text-accent" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}
