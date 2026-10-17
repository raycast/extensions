/**
 * Test double for `@raycast/api`. Raycast components render as accessible DOM so views can be
 * exercised with Testing Library. Only the API surface used by Ebook Hub is implemented.
 */
import { act, createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { vi } from "vitest";

interface Shortcut {
  modifiers: string[];
  key: string;
}

function shortcutLabel(shortcut?: Shortcut): string | undefined {
  return shortcut ? [...shortcut.modifiers, shortcut.key].join("+") : undefined;
}

// Navigation ---------------------------------------------------------------------------------

interface StackEntry {
  element: ReactNode;
  onPop?: () => void;
}

interface Navigation {
  push: (element: ReactNode, onPop?: () => void) => void;
  pop: () => void;
}

const NavigationContext = createContext<Navigation | null>(null);
let rootNavigation: Navigation | null = null;

/** Simulates pressing Escape: pops the top view like Raycast does. */
export function popView(): void {
  act(() => rootNavigation?.pop());
}

/** Keeps every pushed view mounted (like Raycast) and hides all but the top one. */
export function NavigationRoot({ children }: { children: ReactNode }) {
  const stack = useRef<StackEntry[]>([{ element: children }]);
  const [, setVersion] = useState(0);
  const navigation = useMemo<Navigation>(
    () => ({
      push: (element, onPop) => {
        stack.current = [...stack.current, { element, onPop }];
        setVersion((version) => version + 1);
      },
      pop: () => {
        const entries = stack.current;
        if (entries.length <= 1) {
          return;
        }
        stack.current = entries.slice(0, -1);
        entries[entries.length - 1].onPop?.();
        setVersion((version) => version + 1);
      },
    }),
    [],
  );

  rootNavigation = navigation;
  return (
    <NavigationContext.Provider value={navigation}>
      {stack.current.map((entry, index) => (
        <section key={index} data-testid="view" hidden={index < stack.current.length - 1}>
          {entry.element}
        </section>
      ))}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): Navigation {
  const navigation = useContext(NavigationContext);
  if (!navigation) {
    throw new Error("useNavigation must be used inside NavigationRoot");
  }
  return navigation;
}

// Actions ------------------------------------------------------------------------------------

interface ActionProps {
  title: string;
  icon?: unknown;
  shortcut?: Shortcut;
  style?: string;
  onAction?: () => unknown;
}

function ActionComponent({ title, shortcut, style, onAction }: ActionProps) {
  return (
    <button type="button" data-shortcut={shortcutLabel(shortcut)} data-style={style} onClick={() => onAction?.()}>
      {title}
    </button>
  );
}

interface PushActionProps {
  title: string;
  target: ReactNode;
  icon?: unknown;
  shortcut?: Shortcut;
  onPop?: () => void;
}

function PushAction({ title, target, shortcut, onPop }: PushActionProps) {
  const { push } = useNavigation();
  return (
    <button type="button" data-shortcut={shortcutLabel(shortcut)} onClick={() => push(target, onPop)}>
      {title}
    </button>
  );
}

interface SubmitFormActionProps {
  title: string;
  icon?: unknown;
  onSubmit: (values: Record<string, unknown>) => unknown;
}

function SubmitFormAction({ title, onSubmit }: SubmitFormActionProps) {
  return (
    <button type="button" onClick={() => void onSubmit({})}>
      {title}
    </button>
  );
}

function ShowInFinderAction({ path, title = "Show in Finder" }: { path: string; title?: string; shortcut?: Shortcut }) {
  return (
    <button type="button" data-path={path}>
      {title}
    </button>
  );
}

function OpenInBrowserAction({ url, title = "Open in Browser" }: { url: string; title?: string }) {
  return (
    <button type="button" data-url={url}>
      {title}
    </button>
  );
}

export const Action = Object.assign(ActionComponent, {
  Push: PushAction,
  SubmitForm: SubmitFormAction,
  ShowInFinder: ShowInFinderAction,
  OpenInBrowser: OpenInBrowserAction,
  Style: { Regular: "regular", Destructive: "destructive" } as const,
});

function ActionPanelComponent({ children }: { children?: ReactNode }) {
  return (
    <div role="group" aria-label="Actions">
      {children}
    </div>
  );
}

function ActionPanelSection({ title, children }: { title?: string; children?: ReactNode }) {
  return <div data-section={title}>{children}</div>;
}

function ActionPanelSubmenu({ title, children }: { title: string; icon?: unknown; children?: ReactNode }) {
  return (
    <div role="group" aria-label={title}>
      {children}
    </div>
  );
}

export const ActionPanel = Object.assign(ActionPanelComponent, {
  Section: ActionPanelSection,
  Submenu: ActionPanelSubmenu,
});

// Views --------------------------------------------------------------------------------------

interface DetailProps {
  markdown?: string;
  navigationTitle?: string;
  isLoading?: boolean;
  actions?: ReactNode;
}

export function Detail({ markdown, navigationTitle, isLoading = false, actions }: DetailProps) {
  return (
    <article aria-busy={isLoading}>
      <h1>{navigationTitle}</h1>
      <pre data-testid="markdown">{markdown}</pre>
      {actions}
    </article>
  );
}

interface ListProps {
  children?: ReactNode;
  isLoading?: boolean;
  searchText?: string;
  onSearchTextChange?: (text: string) => void;
  searchBarPlaceholder?: string;
  searchBarAccessory?: ReactNode;
  navigationTitle?: string;
  filtering?: boolean;
  throttle?: boolean;
}

function ListComponent(props: ListProps) {
  const [ownText, setOwnText] = useState("");
  return (
    <div aria-busy={props.isLoading ?? false} aria-label={props.navigationTitle}>
      <input
        type="search"
        aria-label="Search"
        placeholder={props.searchBarPlaceholder}
        value={props.searchText ?? ownText}
        onChange={(event) => {
          setOwnText(event.target.value);
          props.onSearchTextChange?.(event.target.value);
        }}
      />
      {props.searchBarAccessory}
      {props.children}
    </div>
  );
}

interface Accessory {
  text?: string;
  tag?: { value: string; color?: unknown };
  icon?: unknown;
  tooltip?: string;
}

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: unknown;
  keywords?: string[];
  accessories?: Accessory[];
  actions?: ReactNode;
}

function ListItem({ title, subtitle, accessories = [], actions }: ListItemProps) {
  return (
    <div role="listitem" aria-label={title}>
      <span>{title}</span>
      {subtitle ? <span>{subtitle}</span> : null}
      {accessories.map((accessory, index) => (
        <span key={index} data-tooltip={accessory.tooltip}>
          {accessory.text ?? accessory.tag?.value}
        </span>
      ))}
      {actions}
    </div>
  );
}

function ListSection({ title, subtitle, children }: { title?: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section aria-label={title} data-subtitle={subtitle}>
      {children}
    </section>
  );
}

interface EmptyViewProps {
  title: string;
  description?: string;
  icon?: unknown;
  actions?: ReactNode;
}

function ListEmptyView({ title, description, actions }: EmptyViewProps) {
  return (
    <div data-testid="empty-view">
      <p>{title}</p>
      {description ? <p>{description}</p> : null}
      {actions}
    </div>
  );
}

function DropdownItem({ title, value }: { title: string; value: string; icon?: unknown }) {
  return <option value={value}>{title}</option>;
}

function DropdownSection({ title, children }: { title?: string; children?: ReactNode }) {
  return <optgroup label={title}>{children}</optgroup>;
}

interface ListDropdownProps {
  tooltip: string;
  value?: string;
  storeValue?: boolean;
  onChange: (value: string) => void;
  children?: ReactNode;
}

function ListDropdown({ tooltip, value, onChange, children }: ListDropdownProps) {
  return (
    <select aria-label={tooltip} value={value} onChange={(event) => onChange(event.target.value)}>
      {children}
    </select>
  );
}

export const List = Object.assign(ListComponent, {
  Item: ListItem,
  Section: ListSection,
  EmptyView: ListEmptyView,
  Dropdown: Object.assign(ListDropdown, { Item: DropdownItem, Section: DropdownSection }),
});

// Forms --------------------------------------------------------------------------------------

interface FieldProps<T> {
  id: string;
  title?: string;
  value?: T;
  error?: string;
  onChange?: (value: T) => void;
  placeholder?: string;
  info?: string;
}

function FieldError({ error }: { error?: string }) {
  return error ? <p role="alert">{error}</p> : null;
}

interface FormProps {
  children?: ReactNode;
  actions?: ReactNode;
  isLoading?: boolean;
  navigationTitle?: string;
}

function FormComponent({ children, actions, isLoading = false, navigationTitle = "Form" }: FormProps) {
  return (
    <form aria-label={navigationTitle} aria-busy={isLoading} onSubmit={(event) => event.preventDefault()}>
      {children}
      {actions}
    </form>
  );
}

function TextField({ id, title, value, error, onChange, placeholder }: FieldProps<string>) {
  return (
    <>
      <input
        id={id}
        aria-label={title}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(event) => onChange?.(event.target.value)}
      />
      <FieldError error={error} />
    </>
  );
}

function FormDropdown({ id, title, value, error, onChange, children }: FieldProps<string> & { children?: ReactNode }) {
  return (
    <>
      <select id={id} aria-label={title} value={value} onChange={(event) => onChange?.(event.target.value)}>
        {children}
      </select>
      <FieldError error={error} />
    </>
  );
}

interface FilePickerProps extends FieldProps<string[]> {
  allowMultipleSelection?: boolean;
  canChooseDirectories?: boolean;
}

function FilePicker({ id, title, value, error, onChange }: FilePickerProps) {
  return (
    <>
      <input
        id={id}
        aria-label={title}
        value={(value ?? []).join("\n")}
        onChange={(event) => onChange?.(event.target.value === "" ? [] : event.target.value.split("\n"))}
      />
      <FieldError error={error} />
    </>
  );
}

function Separator() {
  return <hr />;
}

export const Form = Object.assign(FormComponent, {
  TextField,
  Dropdown: Object.assign(FormDropdown, { Item: DropdownItem }),
  FilePicker,
  Separator,
});

// Values and functions -----------------------------------------------------------------------

export const Icon: Record<string, string> = new Proxy({}, { get: (_target, name) => String(name) });

export const Keyboard = { Shortcut: { Common: { Remove: { modifiers: ["ctrl"], key: "x" } } } };
export const LaunchType = { UserInitiated: "userInitiated", Background: "background" } as const;
export const Alert = { ActionStyle: { Default: "default", Cancel: "cancel", Destructive: "destructive" } } as const;
export const Toast = { Style: { Animated: "animated", Success: "success", Failure: "failure" } } as const;

export interface MockToast {
  style: string;
  title: string;
  message?: string;
}

/** Every toast shown during a test, mutated in place like Raycast's Toast objects. */
export const toasts: MockToast[] = [];

export const showToast = vi.fn(async (options: MockToast) => {
  const toast = { ...options };
  toasts.push(toast);
  return toast;
});

const storage = new Map<string, string>();

export const LocalStorage = {
  getItem: vi.fn(async (key: string) => storage.get(key)),
  setItem: vi.fn(async (key: string, value: string) => {
    storage.set(key, value);
  }),
  removeItem: vi.fn(async (key: string) => {
    storage.delete(key);
  }),
};

export const environment = { supportPath: "" };
export const preferences: Record<string, unknown> = {};

export const getPreferenceValues = vi.fn(() => ({ ...preferences }));
export const getSelectedFinderItems = vi.fn(async (): Promise<{ path: string }[]> => {
  throw new Error("Finder is not the frontmost application");
});
export const confirmAlert = vi.fn<(options: { title: string; message?: string }) => Promise<boolean>>(async () => true);
export const launchCommand = vi.fn<(options: { name: string; type: string }) => Promise<void>>(async () => undefined);
export const open = vi.fn<(target: string) => Promise<void>>(async () => undefined);
export const openExtensionPreferences = vi.fn<() => Promise<void>>(async () => undefined);

export function resetRaycastMock(): void {
  toasts.length = 0;
  storage.clear();
  environment.supportPath = "";
  Object.keys(preferences).forEach((key) => delete preferences[key]);
  vi.resetAllMocks();
}
