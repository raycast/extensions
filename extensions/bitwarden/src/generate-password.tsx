import {
  ActionPanel,
  List,
  Icon,
  Color,
  Clipboard,
  Action,
  showHUD,
  useNavigation,
  Form,
  showToast,
  Toast,
} from "@raycast/api";
import { useBitwarden, usePasswordGenerator, usePasswordOptions } from "./hooks";
import { UnlockForm } from "./components";
import { Bitwarden } from "./api";
import { PASSWORD_OPTIONS_MAP } from "./const";
import { objectEntries } from "./utils";
import { PasswordOptions } from "./types";

const GeneratePassword = () => {
  const { push } = useNavigation();
  const bitwardenApi = new Bitwarden();
  const [state, setSessionToken] = useBitwarden(bitwardenApi);
  const { password, regeneratePassword, isGenerating } = usePasswordGenerator(bitwardenApi);

  if (state.vaultStatus === "locked") {
    return <UnlockForm setSessionToken={setSessionToken} bitwardenApi={bitwardenApi} />;
  }

  const copyToClipboard = async () => {
    if (!password) return;
    await Clipboard.copy(password);
    showHUD("Copied to clipboard");
  };

  const regenerate = () => regeneratePassword();
  const openOptionsMenu = () => push(<Options />);

  return (
    <List
      isLoading={isGenerating}
      searchBarPlaceholder=""
      onSearchTextChange={() => {
        /* ignore search */
      }}
      throttle
    >
      <List.Section title="Password" subtitle={isGenerating && password ? "generating..." : undefined}>
        <List.Item
          key="password"
          id="password"
          title={password ?? "Generating password..."}
          icon={{ source: Icon.Dot, tintColor: isGenerating ? Color.Orange : Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Copy to clipboard" icon={Icon.Clipboard} onAction={copyToClipboard} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          key="copy"
          id="copy"
          title="Copy password"
          icon={Icon.Clipboard}
          actions={
            <ActionPanel>
              <Action title="Copy to clipboard" icon={Icon.Clipboard} onAction={copyToClipboard} />
            </ActionPanel>
          }
        />
        <List.Item
          key="generate"
          id="generate"
          title="Regenerate password"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action title="Regenerate password" icon={Icon.ArrowClockwise} onAction={regenerate} />
            </ActionPanel>
          }
        />
        <List.Item
          key="options"
          id="options"
          title="Options"
          subtitle="Password length, characters, and others"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action title="Change password options" icon={Icon.Gear} onAction={openOptionsMenu} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
};

const isValidField = <O extends keyof PasswordOptions>(option: O, value: PasswordOptions[O]) => {
  if (option === "length") return !isNaN(Number(value)) && Number(value) >= 5 && Number(value) <= 128;
  if (option === "separator") return (value as string).length === 1;
  if (option === "words") return !isNaN(Number(value)) && Number(value) >= 3 && Number(value) <= 20;
  return true;
};

const Options = () => {
  const { options, setOption, clearStorage } = usePasswordOptions();

  if (!options) return null;

  const handleFieldChange =
    <O extends keyof PasswordOptions>(option: O, errorMessage?: string) =>
    async (value: PasswordOptions[O]) => {
      if (!isValidField(option, value)) {
        if (errorMessage) await showToast(Toast.Style.Failure, errorMessage);
        return;
      }
      setOption(option, value);
    };

  return (
    <Form
      actions={
        process.env.NODE_ENV === "development" ? (
          <ActionPanel>
            <Action title="Clear storage" icon={Icon.Trash} onAction={clearStorage} />
          </ActionPanel>
        ) : undefined
      }
    >
      {objectEntries(PASSWORD_OPTIONS_MAP).map(([option, { hint, label, type, errorMessage }]) => {
        if (type === "boolean") {
          return (
            <Form.Checkbox
              key={option}
              id={option}
              title={label}
              label={hint ?? ""}
              value={Boolean(options?.[option] ?? false)}
              onChange={handleFieldChange(option, errorMessage)}
            />
          );
        }

        return (
          <Form.TextField
            key={option}
            id={option}
            title={label}
            value={String(options?.[option] ?? "")}
            onChange={handleFieldChange(option, errorMessage)}
          />
        );
      })}
    </Form>
  );
};

export default GeneratePassword;
