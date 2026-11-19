import { html } from "htm/preact";
import { cn } from "../cn.js";
import { Check, Monitor, Moon, Sun } from "../icons.js";
import { useTheme } from "../theme.js";
import { Popover } from "./ui/Popover.js";

const OPTIONS = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle() {
  const { choice, setChoice } = useTheme();
  const current = OPTIONS.find((option) => option.value === choice) ?? OPTIONS[0];

  return html`
    <${Popover}
      label="Theme"
      trigger=${({ open, toggle }) => html`
        <button
          type="button"
          id="theme"
          aria-label=${`Theme: ${current.label}`}
          aria-haspopup="dialog"
          aria-expanded=${open}
          onClick=${toggle}
          class=${cn(
            "grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors duration-150",
            "hover:bg-surface hover:text-ink sm:size-9",
            open && "bg-surface text-ink",
          )}
        >
          <${current.Icon} size=${18} aria-hidden="true" />
        </button>
      `}
    >
      ${(close) => html`
        <div class="flex flex-col gap-0.5">
          ${OPTIONS.map(
            (option) => html`
              <button
                key=${option.value}
                type="button"
                aria-pressed=${choice === option.value}
                onClick=${() => {
                  setChoice(option.value);
                  close();
                }}
                class=${cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors duration-150 hover:bg-surface",
                  choice === option.value ? "bg-surface text-ink" : "text-muted",
                )}
              >
                <${option.Icon} size=${16} aria-hidden="true" />
                <span class="flex-1">${option.label}</span>
                ${choice === option.value
                  ? html`<${Check} size=${15} className="text-accent" aria-hidden="true" />`
                  : null}
              </button>
            `,
          )}
        </div>
      `}
    <//>
  `;
}
