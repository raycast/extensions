import React, { useState, useEffect, useMemo } from "react";
import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues
} from "@raycast/api";
import { requestDaemon, KloakItem } from "./kloak-ipc.js";
import { generateLocalTotp, evaluatePasswordStrength, TotpResult } from "./totp-helper.js";
import { getItemIcon, extractDomain, cleanDomain } from "./logo-helper.js";
import AddEntryCommand from "./add-entry.js";
import GeneratePasswordCommand from "./generate-password.js";

export function getTagColor(tag: string): Color {
  const t = tag.toLowerCase().trim();
  if (t === "personal" || t === "home" || t === "private") return Color.Blue;
  if (t === "work" || t === "office" || t === "corp" || t === "business") return Color.Orange;
  if (t === "finance" || t === "banking" || t === "crypto" || t === "money" || t === "card") return Color.Green;
  if (t === "social" || t === "media") return Color.Purple;
  if (t === "dev" || t === "code" || t === "api" || t === "tech") return Color.Magenta;
  if (t === "shopping" || t === "store" || t === "e-commerce") return Color.Yellow;
  if (t === "urgent" || t === "security" || t === "important") return Color.Red;
  return Color.SecondaryText;
}

export function getItemTypeColor(type: string): Color {
  switch (type) {
    case "login":
      return Color.Blue;
    case "card":
      return Color.Green;
    case "identity":
      return Color.Orange;
    case "email_alias":
      return Color.Purple;
    case "authenticator":
      return Color.Blue;
    case "secure_note":
      return Color.Yellow;
    default:
      return Color.SecondaryText;
  }
}

export function getItemTypeName(type: string): string {
  switch (type) {
    case "login":
      return "Login";
    case "card":
      return "Payment Card";
    case "identity":
      return "Identity";
    case "email_alias":
      return "Email Alias";
    case "authenticator":
      return "Authenticator";
    case "secure_note":
      return "Secure Note";
    default:
      return "Item";
  }
}

function maskCardNumber(num?: string): string {
  if (!num) return "—";
  const cleaned = num.replace(/\s+/g, "");
  if (cleaned.length < 8) return "•••• •••• •••• ••••";
  return `•••• •••• •••• ${cleaned.slice(-4)}`;
}

function maskSecret(val?: string): string {
  if (!val) return "—";
  if (val.length <= 4) return "••••";
  return `••••••${val.slice(-4)}`;
}

function formatDate(isoString?: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return isoString;
  }
}

async function copyWithAutoClear(text: string, label: string, isSecret = true) {
  if (!text || text.trim().length === 0) {
    showToast({ style: Toast.Style.Failure, title: `No ${label} to copy` });
    return;
  }

  let clearSeconds = 30;
  try {
    const prefs = getPreferenceValues<{ autoClearClipboardSeconds?: string }>();
    if (prefs.autoClearClipboardSeconds) {
      const parsed = parseInt(prefs.autoClearClipboardSeconds, 10);
      if (!isNaN(parsed) && parsed > 0) clearSeconds = parsed;
    }
  } catch {
    // Use fallback 30s
  }

  await Clipboard.copy(text, { concealed: isSecret });
  showToast({
    style: Toast.Style.Success,
    title: `Copied ${label}`,
    message: isSecret ? `Clipboard auto-clears in ${clearSeconds}s` : `Copied to clipboard`
  });

  if (isSecret) {
    setTimeout(async () => {
      const current = await Clipboard.readText();
      if (current === text) {
        await Clipboard.clear();
      }
    }, clearSeconds * 1000);
  }
}

async function copyTotpCode(item: KloakItem, fallbackToken?: string) {
  if (!item.totpSecret) {
    showToast({ style: Toast.Style.Failure, title: "No 2FA configured for this item" });
    return;
  }
  const result = generateLocalTotp(item.totpSecret);
  const token = result?.token || fallbackToken;
  if (token) {
    await copyWithAutoClear(token, `2FA TOTP Code (${token})`, true);
  } else {
    try {
      const res = await requestDaemon("vault.generateTotp", { secret: item.totpSecret });
      if (res?.token) {
        await copyWithAutoClear(res.token, `2FA TOTP Code (${res.token})`, true);
      }
    } catch (e: any) {
      showToast({ style: Toast.Style.Failure, title: "Failed to generate 2FA TOTP", message: e.message });
    }
  }
}

interface ItemDetailScreenProps {
  item: KloakItem;
  onToggleFavorite?: (item: KloakItem) => Promise<void>;
  onReload?: () => Promise<void>;
}

export function ItemDetailScreen({ item, onToggleFavorite, onReload }: ItemDetailScreenProps) {
  const [revealed, setRevealed] = useState<boolean>(false);
  const [totp, setTotp] = useState<TotpResult | null>(() => {
    return item.totpSecret ? generateLocalTotp(item.totpSecret) : null;
  });

  useEffect(() => {
    if (!item.totpSecret) return;
    function update() {
      if (item.totpSecret) {
        const res = generateLocalTotp(item.totpSecret);
        setTotp(res);
      }
    }
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [item.totpSecret]);

  const strength = item.password ? evaluatePasswordStrength(item.password) : null;

  let strengthColor = Color.Red;
  if (strength?.label === "Very Strong") strengthColor = Color.Green;
  else if (strength?.label === "Strong") strengthColor = Color.Blue;
  else if (strength?.label === "Moderate") strengthColor = Color.Yellow;
  else if (strength?.label === "Weak") strengthColor = Color.Orange;

  const typeName = getItemTypeName(item.type);
  const typeColor = getItemTypeColor(item.type);

  // Clean Markdown
  let markdown = "";
  if (item.urls[0]) {
    markdown += `### 🌐 ${cleanDomain(item.urls[0])}\n\n`;
  }
  if (item.type === "secure_note" && item.notes) {
    markdown += `### 📝 Note Content\n\n${item.notes}\n\n`;
  } else if (item.notes && item.notes.trim().length > 0) {
    markdown += `### 📝 Notes\n\n${item.notes}\n\n`;
  }
  if (totp) {
    markdown += `> 🕒 **Live 2FA Active**: \`${totp.token}\` — refreshes in **${totp.secondsRemaining}s**\n\n`;
  }

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Item Type">
            <Detail.Metadata.TagList.Item text={typeName} color={typeColor} />
          </Detail.Metadata.TagList>

          {item.favorite && (
            <Detail.Metadata.Label
              title="Favorite"
              text="⭐ Favorited"
              icon={{ source: Icon.Star, tintColor: Color.Yellow }}
            />
          )}

          {(() => {
            const validTags = (item.tags || []).filter((t) => t.toLowerCase().trim() !== "imported");
            return validTags.length > 0 ? (
              <Detail.Metadata.TagList title="Tags">
                {validTags.map((t) => (
                  <Detail.Metadata.TagList.Item key={t} text={t} color={getTagColor(t)} />
                ))}
              </Detail.Metadata.TagList>
            ) : null;
          })()}

          <Detail.Metadata.Separator />

          {/* Login Details */}
          {item.type === "login" && (
            <>
              <Detail.Metadata.Label title="Username" text={item.username || "—"} icon={Icon.Person} />
              <Detail.Metadata.Label
                title="Password"
                text={revealed ? (item.password || "—") : (item.password ? "••••••••••••" : "—")}
                icon={Icon.Key}
              />
              {item.password && (
                <Detail.Metadata.Label
                  title="Password Length"
                  text={`${item.password.length} characters`}
                  icon={Icon.Text}
                />
              )}
              {strength && (
                <Detail.Metadata.TagList title="Password Strength">
                  <Detail.Metadata.TagList.Item
                    text={`${strength.label} (${strength.entropyBits} bits)`}
                    color={strengthColor}
                  />
                </Detail.Metadata.TagList>
              )}
              {item.urls[0] && (
                <Detail.Metadata.Link
                  title="Website"
                  target={item.urls[0]}
                  text={cleanDomain(item.urls[0])}
                />
              )}
              {totp && (
                <>
                  <Detail.Metadata.Label title="2FA TOTP Code" text={totp.token} icon={Icon.Clock} />
                  <Detail.Metadata.Label title="2FA Expires In" text={`${totp.secondsRemaining}s`} />
                </>
              )}
            </>
          )}

          {/* Payment Card Details */}
          {item.type === "card" && (
            <>
              <Detail.Metadata.Label
                title="Cardholder"
                text={item.card?.cardholderName || item.username || "—"}
                icon={Icon.Person}
              />
              <Detail.Metadata.Label
                title="Card Number"
                text={revealed ? (item.card?.number || "—") : maskCardNumber(item.card?.number)}
                icon={Icon.CreditCard}
              />
              <Detail.Metadata.Label
                title="Brand"
                text={(item.card?.brand || "Visa").toUpperCase()}
              />
              <Detail.Metadata.Label
                title="Expiration"
                text={`${item.card?.expMonth || "MM"} / ${item.card?.expYear || "YY"}`}
              />
              <Detail.Metadata.Label
                title="CVV / CVC"
                text={revealed ? (item.card?.cvv || "—") : (item.card?.cvv ? "•••" : "—")}
              />
              {item.card?.billingAddress && (
                <Detail.Metadata.Label title="Billing Address" text={item.card.billingAddress} />
              )}
            </>
          )}

          {/* Identity Details */}
          {item.type === "identity" && (
            <>
              <Detail.Metadata.Label
                title="Full Name"
                text={[item.identity?.firstName, item.identity?.lastName].filter(Boolean).join(" ") || item.username || "—"}
                icon={Icon.Person}
              />
              <Detail.Metadata.Label title="Email" text={item.identity?.email || "—"} icon={Icon.Envelope} />
              <Detail.Metadata.Label title="Phone" text={item.identity?.phone || "—"} icon={Icon.Phone} />
              <Detail.Metadata.Label
                title="Address"
                text={[item.identity?.address1, item.identity?.city, item.identity?.state, item.identity?.zip, item.identity?.country].filter(Boolean).join(", ") || "—"}
              />
              <Detail.Metadata.Label title="Date of Birth" text={item.identity?.dateOfBirth || "—"} />
              <Detail.Metadata.Label
                title="Passport #"
                text={revealed ? (item.identity?.passportNumber || "—") : maskSecret(item.identity?.passportNumber)}
              />
              <Detail.Metadata.Label
                title="SSN"
                text={revealed ? (item.identity?.ssn || "—") : maskSecret(item.identity?.ssn)}
              />
            </>
          )}

          {/* Email Alias Details */}
          {item.type === "email_alias" && (
            <>
              <Detail.Metadata.Label title="Alias Email" text={item.alias?.aliasEmail || item.username || "—"} icon={Icon.Envelope} />
              <Detail.Metadata.Label title="Forward To" text={item.alias?.forwardTo || "—"} />
              <Detail.Metadata.Label title="Provider" text={item.alias?.provider || "DuckDuckGo"} />
            </>
          )}

          {/* Authenticator Details */}
          {item.type === "authenticator" && (
            <>
              <Detail.Metadata.Label title="Issuer" text={item.authenticatorDetails?.issuer || item.title} icon={Icon.Lock} />
              {totp && (
                <>
                  <Detail.Metadata.Label title="Live 2FA Code" text={totp.token} icon={Icon.Clock} />
                  <Detail.Metadata.Label title="Expires In" text={`${totp.secondsRemaining}s`} />
                </>
              )}
              <Detail.Metadata.Label title="Algorithm" text={item.authenticatorDetails?.algorithm || "TOTP"} />
            </>
          )}

          {/* Custom Fields */}
          {item.customFields && item.customFields.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              {item.customFields.map((field) => (
                <Detail.Metadata.Label
                  key={field.id}
                  title={field.name}
                  text={field.type === "hidden" && !revealed ? "••••••••" : field.value}
                />
              ))}
            </>
          )}

          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={formatDate(item.createdAt)} />
          <Detail.Metadata.Label title="Last Modified" text={formatDate(item.updatedAt)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy Credentials">
            {item.password && (
              <Action
                title="Copy Password"
                icon={Icon.Key}
                onAction={() => copyWithAutoClear(item.password!, "Password", true)}
              />
            )}
            {item.username && (
              <Action
                title="Copy Username"
                icon={Icon.Person}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
                onAction={() => copyWithAutoClear(item.username!, "Username", false)}
              />
            )}
            {item.totpSecret && (
              <Action
                title={totp ? `Copy 2FA Code (${totp.token})` : "Copy 2FA TOTP Code"}
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => copyWithAutoClear(totp?.token || "", "2FA TOTP Code", true)}
              />
            )}
            {item.card?.number && (
              <Action
                title="Copy Card Number"
                icon={Icon.CreditCard}
                onAction={() => copyWithAutoClear(item.card!.number!, "Card Number", true)}
              />
            )}
            {item.card?.cvv && (
              <Action
                title="Copy CVV Code"
                icon={Icon.Lock}
                onAction={() => copyWithAutoClear(item.card!.cvv!, "CVV", true)}
              />
            )}
            {item.card?.expMonth && item.card?.expYear && (
              <Action
                title="Copy Expiration Date"
                icon={Icon.Calendar}
                onAction={() =>
                  copyWithAutoClear(`${item.card!.expMonth}/${item.card!.expYear}`, "Expiration Date", false)
                }
              />
            )}
            {item.type === "identity" && item.identity?.email && (
              <Action
                title="Copy Email"
                icon={Icon.Envelope}
                onAction={() => copyWithAutoClear(item.identity!.email!, "Email", false)}
              />
            )}
            {item.type === "identity" && item.identity?.phone && (
              <Action
                title="Copy Phone Number"
                icon={Icon.Phone}
                onAction={() => copyWithAutoClear(item.identity!.phone!, "Phone Number", false)}
              />
            )}
            {item.type === "email_alias" && item.alias?.aliasEmail && (
              <Action
                title="Copy Alias Email"
                icon={Icon.Envelope}
                onAction={() => copyWithAutoClear(item.alias!.aliasEmail!, "Alias Email", false)}
              />
            )}
            {item.notes && (
              <Action
                title="Copy Note Content"
                icon={Icon.Document}
                onAction={() => copyWithAutoClear(item.notes!, "Note Content", false)}
              />
            )}
            {item.urls[0] && (
              <Action
                title="Copy Website URL"
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                onAction={() => copyWithAutoClear(item.urls[0], "Website URL", false)}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Paste into Active App">
            {item.password && (
              <Action.Paste
                title="Paste Password"
                content={item.password}
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
              />
            )}
            {item.username && (
              <Action.Paste
                title="Paste Username"
                content={item.username}
                icon={Icon.Person}
                shortcut={{ modifiers: ["cmd", "opt"], key: "u" }}
              />
            )}
            {totp && (
              <Action.Paste
                title={`Paste 2FA Code (${totp.token})`}
                content={totp.token}
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
              />
            )}
            {item.card?.number && (
              <Action.Paste
                title="Paste Card Number"
                content={item.card.number}
                icon={Icon.CreditCard}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Item Controls">
            <Action
              title={revealed ? "Hide Password / Secret" : "Reveal Password / Secret"}
              icon={revealed ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={() => setRevealed((prev) => !prev)}
            />
            {item.urls[0] && (
              <Action.OpenInBrowser
                url={item.urls[0]}
                title="Open Website"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            {onToggleFavorite && (
              <Action
                title={item.favorite ? "Remove from Favorites" : "Add to Favorites"}
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => onToggleFavorite(item)}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function SearchVaultCommand() {
  const [items, setItems] = useState<KloakItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");
  const [category, setCategory] = useState<string>("all");
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [totpTokens, setTotpTokens] = useState<Record<string, TotpResult>>({});

  useEffect(() => {
    loadItems();
  }, []);

  // Live TOTP timer ticker: updates every 1000ms for active items with TOTP secret
  useEffect(() => {
    function updateTotps() {
      const newTokens: Record<string, TotpResult> = {};
      for (const item of items) {
        if (item.totpSecret) {
          const res = generateLocalTotp(item.totpSecret);
          if (res) newTokens[item.id] = res;
        }
      }
      setTotpTokens(newTokens);
    }

    updateTotps();
    const timer = setInterval(updateTotps, 1000);
    return () => clearInterval(timer);
  }, [items]);

  async function loadItems() {
    setIsLoading(true);
    try {
      const res = await requestDaemon("vault.getItems");
      setItems(res || []);
    } catch (err: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Vault Locked or Unavailable",
        message: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleFavorite(item: KloakItem) {
    try {
      const updatedFav = !item.favorite;
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, favorite: updatedFav } : it))
      );
      await requestDaemon("vault.toggleFavorite", { id: item.id });
      showToast({
        style: Toast.Style.Success,
        title: updatedFav ? "Added to Favorites ⭐" : "Removed from Favorites"
      });
    } catch (e: any) {
      showToast({ style: Toast.Style.Failure, title: "Failed to update favorite", message: e.message });
      loadItems();
    }
  }

  const toggleRevealPassword = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Category counts for the sidebar dropdown
  const counts = useMemo(() => {
    const res = {
      all: items.length,
      favorites: items.filter((i) => i.favorite).length,
      login: items.filter((i) => i.type === "login").length,
      secure_note: items.filter((i) => i.type === "secure_note").length,
      card: items.filter((i) => i.type === "card").length,
      identity: items.filter((i) => i.type === "identity").length,
      email_alias: items.filter((i) => i.type === "email_alias").length,
      authenticator: items.filter((i) => i.type === "authenticator" || (i.type === "login" && !!i.totpSecret)).length
    };
    return res;
  }, [items]);

  // Filter items by category & search query
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (category === "favorites" && !item.favorite) return false;
      if (category === "authenticator") {
        if (item.type !== "authenticator" && !(item.type === "login" && !!item.totpSecret)) {
          return false;
        }
      } else if (category !== "all" && category !== "favorites") {
        if (item.type !== category) return false;
      }

      if (!searchText) return true;
      const q = searchText.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.username?.toLowerCase().includes(q) ?? false) ||
        (item.notes?.toLowerCase().includes(q) ?? false) ||
        item.urls.some((u) => u.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });
  }, [items, category, searchText]);

  function renderItemMarkdown(item: KloakItem): string | undefined {
    if (item.type === "secure_note" && item.notes) {
      return `### 📝 Note Content\n\n${item.notes}`;
    }
    if (item.notes && item.notes.trim().length > 0) {
      return `### 📝 Notes\n\n${item.notes}`;
    }
    return undefined;
  }

  function renderItemMetadata(item: KloakItem) {
    const isRevealed = revealedPasswords[item.id] ?? false;
    const strength = item.password ? evaluatePasswordStrength(item.password) : null;
    const totp = item.totpSecret ? totpTokens[item.id] : null;

    let typeTagColor = Color.Blue;
    let typeName = "Login";
    if (item.type === "card") {
      typeTagColor = Color.Green;
      typeName = "Payment Card";
    } else if (item.type === "identity") {
      typeTagColor = Color.Orange;
      typeName = "Identity";
    } else if (item.type === "email_alias") {
      typeTagColor = Color.Purple;
      typeName = "Email Alias";
    } else if (item.type === "authenticator") {
      typeTagColor = Color.Blue;
      typeName = "Authenticator";
    } else if (item.type === "secure_note") {
      typeTagColor = Color.Yellow;
      typeName = "Secure Note";
    }

    let strengthColor = Color.Red;
    if (strength?.label === "Very Strong") strengthColor = Color.Green;
    else if (strength?.label === "Strong") strengthColor = Color.Blue;
    else if (strength?.label === "Moderate") strengthColor = Color.Yellow;
    else if (strength?.label === "Weak") strengthColor = Color.Orange;

    return (
      <List.Item.Detail.Metadata>
        {/* Credentials Section */}
        {item.type === "login" && (
          <>
            <List.Item.Detail.Metadata.Label
              title="Username"
              text={item.username || "—"}
              icon={Icon.Person}
            />
            <List.Item.Detail.Metadata.Label
              title="Password"
              text={isRevealed ? (item.password || "—") : (item.password ? "••••••••••••" : "—")}
              icon={Icon.Key}
            />
            {item.password && (
              <List.Item.Detail.Metadata.Label
                title="Password Length"
                text={`${item.password.length} characters`}
                icon={Icon.Text}
              />
            )}
            {strength && (
              <List.Item.Detail.Metadata.TagList title="Password Strength">
                <List.Item.Detail.Metadata.TagList.Item
                  text={`${strength.label} (${strength.entropyBits} bits)`}
                  color={strengthColor}
                />
              </List.Item.Detail.Metadata.TagList>
            )}
            {item.urls[0] && (
              <List.Item.Detail.Metadata.Link
                title="Website"
                target={item.urls[0]}
                text={cleanDomain(item.urls[0])}
              />
            )}
            {totp && (
              <>
                <List.Item.Detail.Metadata.Label
                  title="2FA TOTP Code"
                  text={totp.token}
                  icon={Icon.Clock}
                />
                <List.Item.Detail.Metadata.Label
                  title="2FA Expires In"
                  text={`${totp.secondsRemaining}s`}
                />
              </>
            )}
          </>
        )}

        {/* Payment Card Details */}
        {item.type === "card" && (
          <>
            <List.Item.Detail.Metadata.Label
              title="Cardholder"
              text={item.card?.cardholderName || item.username || "—"}
              icon={Icon.Person}
            />
            <List.Item.Detail.Metadata.Label
              title="Card Number"
              text={isRevealed ? (item.card?.number || "—") : maskCardNumber(item.card?.number)}
              icon={Icon.CreditCard}
            />
            <List.Item.Detail.Metadata.Label
              title="Brand"
              text={(item.card?.brand || "Visa").toUpperCase()}
            />
            <List.Item.Detail.Metadata.Label
              title="Expiration"
              text={`${item.card?.expMonth || "MM"} / ${item.card?.expYear || "YY"}`}
            />
            <List.Item.Detail.Metadata.Label
              title="CVV / CVC"
              text={isRevealed ? (item.card?.cvv || "—") : (item.card?.cvv ? "•••" : "—")}
            />
            {item.card?.billingAddress && (
              <List.Item.Detail.Metadata.Label
                title="Billing Address"
                text={item.card.billingAddress}
              />
            )}
          </>
        )}

        {/* Identity Details */}
        {item.type === "identity" && (
          <>
            <List.Item.Detail.Metadata.Label
              title="Full Name"
              text={[item.identity?.firstName, item.identity?.lastName].filter(Boolean).join(" ") || item.username || "—"}
              icon={Icon.Person}
            />
            <List.Item.Detail.Metadata.Label
              title="Email"
              text={item.identity?.email || "—"}
              icon={Icon.Envelope}
            />
            <List.Item.Detail.Metadata.Label
              title="Phone"
              text={item.identity?.phone || "—"}
              icon={Icon.Phone}
            />
            <List.Item.Detail.Metadata.Label
              title="Address"
              text={[item.identity?.address1, item.identity?.city, item.identity?.state, item.identity?.zip, item.identity?.country].filter(Boolean).join(", ") || "—"}
            />
            <List.Item.Detail.Metadata.Label
              title="Date of Birth"
              text={item.identity?.dateOfBirth || "—"}
            />
            <List.Item.Detail.Metadata.Label
              title="Passport #"
              text={isRevealed ? (item.identity?.passportNumber || "—") : maskSecret(item.identity?.passportNumber)}
            />
            <List.Item.Detail.Metadata.Label
              title="SSN"
              text={isRevealed ? (item.identity?.ssn || "—") : maskSecret(item.identity?.ssn)}
            />
          </>
        )}

        {/* Email Alias Details */}
        {item.type === "email_alias" && (
          <>
            <List.Item.Detail.Metadata.Label
              title="Alias Email"
              text={item.alias?.aliasEmail || item.username || "—"}
              icon={Icon.Envelope}
            />
            <List.Item.Detail.Metadata.Label
              title="Forward To"
              text={item.alias?.forwardTo || "—"}
            />
            <List.Item.Detail.Metadata.Label
              title="Provider"
              text={item.alias?.provider || "DuckDuckGo"}
            />
          </>
        )}

        {/* Authenticator Details */}
        {item.type === "authenticator" && (
          <>
            <List.Item.Detail.Metadata.Label
              title="Issuer"
              text={item.authenticatorDetails?.issuer || item.title}
              icon={Icon.Lock}
            />
            {totp && (
              <>
                <List.Item.Detail.Metadata.Label
                  title="Live 2FA Code"
                  text={totp.token}
                  icon={Icon.Clock}
                />
                <List.Item.Detail.Metadata.Label
                  title="Expires In"
                  text={`${totp.secondsRemaining}s`}
                />
              </>
            )}
            <List.Item.Detail.Metadata.Label
              title="Algorithm"
              text={item.authenticatorDetails?.algorithm || "TOTP"}
            />
          </>
        )}

        {/* Custom Fields */}
        {item.customFields && item.customFields.length > 0 && (
          <>
            <List.Item.Detail.Metadata.Separator />
            {item.customFields.map((field) => (
              <List.Item.Detail.Metadata.Label
                key={field.id}
                title={field.name}
                text={field.type === "hidden" && !isRevealed ? "••••••••" : field.value}
              />
            ))}
          </>
        )}

        {(() => {
          const validTags = (item.tags || []).filter((t) => t.toLowerCase().trim() !== "imported");
          return validTags.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {validTags.map((t) => (
                <List.Item.Detail.Metadata.TagList.Item key={t} text={t} color={getTagColor(t)} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null;
        })()}

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.TagList title="Item Type">
          <List.Item.Detail.Metadata.TagList.Item text={typeName} color={typeTagColor} />
        </List.Item.Detail.Metadata.TagList>

        <List.Item.Detail.Metadata.Label
          title="Favorite"
          text={item.favorite ? "⭐ Favorited" : "No"}
          icon={item.favorite ? { source: Icon.Star, tintColor: Color.Yellow } : undefined}
        />

        {/* Timestamps */}
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Created" text={formatDate(item.createdAt)} />
        <List.Item.Detail.Metadata.Label title="Last Modified" text={formatDate(item.updatedAt)} />
      </List.Item.Detail.Metadata>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search Kloak passwords, usernames, websites, tags..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Category"
          value={category}
          onChange={setCategory}
        >
          <List.Dropdown.Section title="Vault">
            <List.Dropdown.Item
              value="all"
              title={`All Items (${counts.all})`}
              icon={Icon.Tray}
            />
            <List.Dropdown.Item
              value="favorites"
              title={`Favorites (${counts.favorites})`}
              icon={Icon.Star}
            />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Categories">
            <List.Dropdown.Item
              value="login"
              title={`Logins (${counts.login})`}
              icon={Icon.Key}
            />
            <List.Dropdown.Item
              value="secure_note"
              title={`Secure Notes (${counts.secure_note})`}
              icon={Icon.Document}
            />
            <List.Dropdown.Item
              value="card"
              title={`Payment Cards (${counts.card})`}
              icon={Icon.CreditCard}
            />
            <List.Dropdown.Item
              value="identity"
              title={`Identities (${counts.identity})`}
              icon={Icon.Person}
            />
            <List.Dropdown.Item
              value="email_alias"
              title={`Email Aliases (${counts.email_alias})`}
              icon={Icon.Envelope}
            />
            <List.Dropdown.Item
              value="authenticator"
              title={`Authenticator (2FA) (${counts.authenticator})`}
              icon={Icon.Lock}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={`Vault Items (${filtered.length})`}>
        {filtered.map((item) => {
          const isRevealed = revealedPasswords[item.id] ?? false;
          const liveTotp = item.totpSecret ? totpTokens[item.id] : null;
          const validTags = (item.tags || []).filter((t) => t.toLowerCase().trim() !== "imported");

          // Build accessories:
          // When right sidebar is shown (isShowingDetail === true), hide all tags from list items to maintain clean layout.
          // When right sidebar is hidden, show tags, 2FA code, and favorite star.
          const accessories: List.Item.Accessory[] = [];

          if (isShowingDetail) {
            // Right sidebar is shown -> NO TAGS VISIBLE IN THE LIST
            if (item.favorite) {
              accessories.push({
                icon: { source: Icon.Star, tintColor: Color.Yellow },
                tooltip: "Favorite"
              });
            }
          } else {
            // Full list view (Right sidebar hidden) -> DISPLAY TAGS & BADGES
            if (validTags.length > 0) {
              for (const tag of validTags.slice(0, 2)) {
                accessories.push({
                  tag: { value: tag, color: getTagColor(tag) },
                  tooltip: `Tag: ${tag}`
                });
              }
            } else {
              // Category tag
              accessories.push({
                tag: { value: getItemTypeName(item.type), color: getItemTypeColor(item.type) },
                tooltip: `Category: ${getItemTypeName(item.type)}`
              });
            }

            if (liveTotp) {
              accessories.push({
                tag: { value: liveTotp.token, color: Color.Green },
                icon: Icon.Clock,
                tooltip: `2FA Active (${liveTotp.secondsRemaining}s)`
              });
            }

            if (item.favorite) {
              accessories.push({
                icon: { source: Icon.Star, tintColor: Color.Yellow },
                tooltip: "Favorite"
              });
            }
          }

          return (
            <List.Item
              key={item.id}
              icon={getItemIcon(item)}
              title={item.title}
              subtitle={
                !isShowingDetail
                  ? item.username ||
                    item.card?.cardholderName ||
                    item.alias?.aliasEmail ||
                    (item.urls[0] ? cleanDomain(item.urls[0]) : "")
                  : undefined
              }
              accessories={accessories}
              detail={
                <List.Item.Detail
                  markdown={renderItemMarkdown(item)}
                  metadata={renderItemMetadata(item)}
                />
              }
              actions={
                <ActionPanel>
                  {/* Primary Action on Enter: Toggle Show/Hide Details (Speedtest Style) */}
                  <Action
                    title={isShowingDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    onAction={() => setIsShowingDetail((prev) => !prev)}
                  />

                  <ActionPanel.Section title="Copy Credentials">
                    {item.password && (
                      <Action
                        title="Copy Password"
                        icon={Icon.Key}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                        onAction={() => copyWithAutoClear(item.password!, "Password", true)}
                      />
                    )}

                    {item.username && (
                      <Action
                        title="Copy Username"
                        icon={Icon.Person}
                        shortcut={{ modifiers: ["cmd"], key: "u" }}
                        onAction={() => copyWithAutoClear(item.username!, "Username", false)}
                      />
                    )}

                    {item.totpSecret && (
                      <Action
                        title={liveTotp ? `Copy 2FA Code (${liveTotp.token})` : "Copy 2FA TOTP Code"}
                        icon={Icon.Clock}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        onAction={() => copyTotpCode(item)}
                      />
                    )}

                    {item.card?.number && (
                      <Action
                        title="Copy Card Number"
                        icon={Icon.CreditCard}
                        onAction={() => copyWithAutoClear(item.card!.number!, "Card Number", true)}
                      />
                    )}
                    {item.card?.cvv && (
                      <Action
                        title="Copy CVV Code"
                        icon={Icon.Lock}
                        onAction={() => copyWithAutoClear(item.card!.cvv!, "CVV", true)}
                      />
                    )}
                    {item.card?.expMonth && item.card?.expYear && (
                      <Action
                        title="Copy Expiration Date"
                        icon={Icon.Calendar}
                        onAction={() =>
                          copyWithAutoClear(
                            `${item.card!.expMonth}/${item.card!.expYear}`,
                            "Expiration Date",
                            false
                          )
                        }
                      />
                    )}

                    {/* Identity profile copies */}
                    {item.type === "identity" && item.identity?.email && (
                      <Action
                        title="Copy Email"
                        icon={Icon.Envelope}
                        onAction={() => copyWithAutoClear(item.identity!.email!, "Email", false)}
                      />
                    )}
                    {item.type === "identity" && item.identity?.phone && (
                      <Action
                        title="Copy Phone Number"
                        icon={Icon.Phone}
                        onAction={() => copyWithAutoClear(item.identity!.phone!, "Phone Number", false)}
                      />
                    )}

                    {/* Email Alias */}
                    {item.type === "email_alias" && item.alias?.aliasEmail && (
                      <Action
                        title="Copy Alias Email"
                        icon={Icon.Envelope}
                        onAction={() => copyWithAutoClear(item.alias!.aliasEmail!, "Alias Email", false)}
                      />
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <Action
                        title="Copy Note Content"
                        icon={Icon.Document}
                        onAction={() => copyWithAutoClear(item.notes!, "Note Content", false)}
                      />
                    )}

                    {/* Website URL */}
                    {item.urls[0] && (
                      <Action
                        title="Copy Website URL"
                        icon={Icon.Globe}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                        onAction={() => copyWithAutoClear(item.urls[0], "Website URL", false)}
                      />
                    )}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Paste into Active App">
                    {item.password && (
                      <Action.Paste
                        title="Paste Password"
                        content={item.password}
                        icon={Icon.Key}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
                      />
                    )}
                    {item.username && (
                      <Action.Paste
                        title="Paste Username"
                        content={item.username}
                        icon={Icon.Person}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "u" }}
                      />
                    )}
                    {liveTotp && (
                      <Action.Paste
                        title={`Paste 2FA Code (${liveTotp.token})`}
                        content={liveTotp.token}
                        icon={Icon.Clock}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
                      />
                    )}
                    {item.card?.number && (
                      <Action.Paste
                        title="Paste Card Number"
                        content={item.card.number}
                        icon={Icon.CreditCard}
                      />
                    )}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Item Controls">
                    <Action
                      title={isShowingDetail ? "Hide Details Sidebar" : "Show Details Sidebar"}
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => setIsShowingDetail((prev) => !prev)}
                    />

                    <Action
                      title={isRevealed ? "Hide Password / Secret" : "Reveal Password / Secret"}
                      icon={isRevealed ? Icon.EyeDisabled : Icon.Eye}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={() => toggleRevealPassword(item.id)}
                    />

                    {item.urls[0] && (
                      <Action.OpenInBrowser
                        url={item.urls[0]}
                        title="Open Website"
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    )}

                    <Action
                      title={item.favorite ? "Remove from Favorites" : "Add to Favorites"}
                      icon={Icon.Star}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() => toggleFavorite(item)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="View & Manage">
                    <Action.Push
                      title="Add New Entry"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={<AddEntryCommand />}
                    />

                    <Action.Push
                      title="Generate Password"
                      icon={Icon.Wand}
                      shortcut={{ modifiers: ["cmd"], key: "g" }}
                      target={<GeneratePasswordCommand />}
                    />

                    <Action
                      title="Reload Vault"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadItems}
                    />

                    <Action
                      title="Lock Vault"
                      icon={Icon.Lock}
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                      onAction={async () => {
                        await requestDaemon("vault.lock");
                        showToast({ style: Toast.Style.Success, title: "Kloak Vault Locked" });
                        setItems([]);
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
