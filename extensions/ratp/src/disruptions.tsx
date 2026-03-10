import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  openExtensionPreferences,
  Detail,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getDisruptions, type Disruption, parseDateTime } from "./utils/api";

const SEVERITY_ORDER = [
  "NO_SERVICE",
  "REDUCED_SERVICE",
  "SIGNIFICANT_DELAYS",
  "MODIFIED_SERVICE",
  "OTHER_EFFECT",
  "UNKNOWN_EFFECT",
];

function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, "")
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, "")
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, "")
    .replace(/[\u{200D}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

function cleanText(text: string): string {
  return stripEmojis(stripHtml(text));
}

function severityColor(effect: string): Color {
  switch (effect) {
    case "NO_SERVICE":
      return Color.Red;
    case "REDUCED_SERVICE":
    case "SIGNIFICANT_DELAYS":
      return Color.Orange;
    case "MODIFIED_SERVICE":
      return Color.Yellow;
    default:
      return Color.SecondaryText;
  }
}

function severityIcon(effect: string): Icon {
  switch (effect) {
    case "NO_SERVICE":
      return Icon.XMarkCircle;
    case "REDUCED_SERVICE":
    case "SIGNIFICANT_DELAYS":
      return Icon.ExclamationMark;
    case "MODIFIED_SERVICE":
      return Icon.Warning;
    default:
      return Icon.Info;
  }
}

function severityLabel(effect: string): string {
  switch (effect) {
    case "NO_SERVICE":
      return "Service Suspended";
    case "REDUCED_SERVICE":
      return "Reduced Service";
    case "SIGNIFICANT_DELAYS":
      return "Significant Delays";
    case "MODIFIED_SERVICE":
      return "Modified Service";
    case "OTHER_EFFECT":
      return "Other Disruption";
    default:
      return "Information";
  }
}

function getTitleMessage(disruption: Disruption): string {
  const msg = disruption.messages?.find((m) => m.channel?.name === "titre");
  if (msg?.text) return cleanText(msg.text);
  return "";
}

function getDetailMarkdown(disruption: Disruption): string {
  const lines: string[] = [];
  const title = getDisruptionTitle(disruption);
  const effect = disruption.severity?.effect ?? "";

  lines.push(`## ${title}`);
  lines.push(`**${severityLabel(effect)}**`);
  lines.push("");

  const detailMsg = disruption.messages?.find((m) => m.channel?.name !== "titre" && m.text);
  const titleMsg = disruption.messages?.find((m) => m.channel?.name === "titre" && m.text);

  if (detailMsg?.text) {
    lines.push(cleanText(detailMsg.text));
    lines.push("");
  } else if (titleMsg?.text) {
    lines.push(cleanText(titleMsg.text));
    lines.push("");
  }

  if (disruption.application_periods?.length > 0) {
    lines.push("---");
    lines.push("**Period**");
    for (const p of disruption.application_periods) {
      const begin = parseDateTime(p.begin).toLocaleString("en-US");
      const end = parseDateTime(p.end).toLocaleString("en-US");
      lines.push(`From ${begin} to ${end}`);
    }
    lines.push("");
  }

  if (disruption.impacted_objects?.length > 1) {
    lines.push("---");
    lines.push("**Impacted Lines / Stops**");
    for (const obj of disruption.impacted_objects) {
      lines.push(`- ${cleanText(obj.pt_object.name)}`);
    }
  }

  return lines.join("\n").trim();
}

function getDisruptionTitle(disruption: Disruption): string {
  const obj = disruption.impacted_objects?.[0]?.pt_object;
  if (obj?.name) return cleanText(obj.name);
  return "Disruption";
}

export default function Disruptions() {
  const { isLoading, data, revalidate, error } = usePromise(getDisruptions, [], {
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err.message,
      });
    },
  });

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action.OpenInBrowser title="Get Free Api Key" url="https://prim.iledefrance-mobilites.fr" />
            <Action title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const disruptions = data ?? [];
  const grouped = new Map<string, Disruption[]>();

  for (const d of disruptions) {
    const effect = d.severity?.effect ?? "UNKNOWN_EFFECT";
    if (!grouped.has(effect)) grouped.set(effect, []);
    grouped.get(effect)!.push(d);
  }

  const sortedGroups = Array.from(grouped.entries()).sort(
    (a, b) => SEVERITY_ORDER.indexOf(a[0]) - SEVERITY_ORDER.indexOf(b[0]),
  );

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Filter alerts...">
      {disruptions.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Disruptions"
          description="The network is operating normally"
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        sortedGroups.map(([effect, items]) => (
          <List.Section key={effect} title={severityLabel(effect)} subtitle={`${items.length}`}>
            {items.map((disruption) => {
              const titleMsg = getTitleMessage(disruption);
              return (
                <List.Item
                  key={disruption.id}
                  icon={{
                    source: severityIcon(effect),
                    tintColor: severityColor(effect),
                  }}
                  title={getDisruptionTitle(disruption)}
                  subtitle={titleMsg.slice(0, 80)}
                  detail={<List.Item.Detail markdown={getDetailMarkdown(disruption)} />}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={revalidate}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}
