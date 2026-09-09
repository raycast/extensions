import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Keyboard,
  closeMainWindow,
  openExtensionPreferences,
  popToRoot,
  showHUD,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { AliasError, SuffixMode, buildAlias, randomToken } from "./lib/alias";
import { getActiveTab } from "./lib/browsers";
import { DOMAIN_DEPTH_OPTIONS, DomainDepth, extractHost, isDomainDepth } from "./lib/domain";
import { getSettings } from "./lib/settings";

export default function Command() {
  const settings = useMemo(() => getSettings(), []);

  const [accountIndex, setAccountIndex] = useState("0");
  const [source, setSource] = useState("");
  const [literal, setLiteral] = useState(false);
  const [depth, setDepth] = useState<DomainDepth>(settings.depth);
  const [suffixMode, setSuffixMode] = useState<SuffixMode>(settings.suffixMode);
  const [token, setToken] = useState(() => randomToken(settings.randomLength));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tab = await getActiveTab({
          browserSource: settings.browserSource,
          preferredBrowser: settings.preferredBrowser,
        });
        if (!cancelled) setSource(tab.url);
      } catch {
        // No browser tab available: the user simply types a domain instead.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings.browserSource, settings.preferredBrowser]);

  const account = settings.accounts[Number(accountIndex)] ?? settings.accounts[0];

  const preview = useMemo(() => {
    if (!account || !source.trim()) {
      return { address: "", error: "" };
    }
    const host = literal ? "" : extractHost(source);
    if (!literal && !host) {
      return { address: "", error: "Not a valid URL or hostname." };
    }
    try {
      const result = buildAlias({
        account,
        source: literal ? source : (host as string),
        sourceIsLabel: literal,
        host: host ?? "",
        depth,
        stripWww: settings.stripWww,
        separator: settings.separator,
        suffixMode,
        suffixSeparator: settings.suffixSeparator,
        dateFormat: settings.dateFormat,
        randomLength: settings.randomLength,
        randomOverride: token,
        template: settings.template,
        catchAllTemplate: settings.catchAllTemplate,
        lowercase: settings.lowercase,
        dotReplacement: settings.dotReplacement,
        maxAliasLength: settings.maxAliasLength,
      });
      return { address: result.address, error: "" };
    } catch (error) {
      return { address: "", error: error instanceof AliasError ? error.message : String(error) };
    }
  }, [account, source, literal, depth, suffixMode, token, settings]);

  async function submit(mode: "copy" | "paste" | "copyPaste") {
    if (!preview.address) {
      await showFailureToast(new Error(preview.error || "Enter a URL, a domain or a label first."), {
        title: "Nothing to copy",
      });
      return;
    }
    if (mode === "copy") {
      await Clipboard.copy(preview.address);
      await showHUD(`Copied ${preview.address}`);
      await popToRoot();
      return;
    }
    await closeMainWindow();
    if (mode === "copyPaste") {
      await Clipboard.copy(preview.address);
    }
    await Clipboard.paste(preview.address);
    await showHUD(mode === "paste" ? `Pasted ${preview.address}` : `Pasted and copied ${preview.address}`);
  }

  if (settings.accounts.length === 0) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      >
        <Form.Description
          title="No account yet"
          text={
            "Add at least one email account in the extension preferences, for example me@gmail.com or @mydomain.com."
          }
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title={settings.action === "copy" ? "Copy Alias" : "Paste and Copy Alias"}
            icon={settings.action === "copy" ? Icon.Clipboard : Icon.Text}
            onAction={() => submit(settings.action === "copy" ? "copy" : "copyPaste")}
          />
          <Action title="Copy Alias" icon={Icon.Clipboard} onAction={() => submit("copy")} />
          <Action title="Paste Alias" icon={Icon.Text} onAction={() => submit("paste")} />
          <Action
            title="Regenerate Random Token"
            icon={Icon.Repeat}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => setToken(randomToken(settings.randomLength))}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="account" title="Account" value={accountIndex} onChange={setAccountIndex}>
        {settings.accounts.map((entry, index) => (
          <Form.Dropdown.Item
            key={`${entry.name}-${index}`}
            value={String(index)}
            title={entry.name}
            icon={entry.isCatchAll ? Icon.AtSymbol : Icon.Envelope}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="source"
        title={literal ? "Label" : "URL or Domain"}
        placeholder={literal ? "newsletter" : "https://account.example.com/login"}
        value={source}
        onChange={setSource}
      />

      <Form.Checkbox
        id="literal"
        label="Use the text above as the label, do not parse it as a domain"
        value={literal}
        onChange={setLiteral}
      />

      <Form.Dropdown
        id="depth"
        title="Domain Depth"
        value={depth}
        onChange={(value) => setDepth(isDomainDepth(value) ? value : "auto")}
      >
        {DOMAIN_DEPTH_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="suffix"
        title="Extra Suffix"
        value={suffixMode}
        onChange={(value) => setSuffixMode(value as SuffixMode)}
      >
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="date" title="Date" />
        <Form.Dropdown.Item value="random" title="Random token" />
        <Form.Dropdown.Item value="both" title="Date and random token" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description title="Preview" text={preview.address || preview.error || "—"} />
    </Form>
  );
}
