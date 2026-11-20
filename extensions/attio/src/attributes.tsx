import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { listAttributes } from "./api/endpoints";
import type { AttioObject, Attribute } from "./api/types";
import { guard } from "./components/Guard";
import { useAttio } from "./hooks/useAttio";
import { getObjectTitle } from "./lib/display";
import OpenInAttio from "./open-in-attio";

const ATTRIBUTE_ICONS: Record<string, Icon> = {
  text: Icon.Text,
  domain: Icon.Globe,
  location: Icon.Pin,
  currency: Icon.BankNote,
  date: Icon.Calendar,
  timestamp: Icon.Clock,
  checkbox: Icon.CheckCircle,
  number: Icon.Hashtag,
  rating: Icon.Star,
  select: Icon.List,
  status: Icon.CircleProgress,
  "email-address": Icon.Envelope,
  "phone-number": Icon.Phone,
  "personal-name": Icon.Person,
  "record-reference": Icon.Link,
  "actor-reference": Icon.PersonCircle,
  interaction: Icon.ArrowClockwise,
};

export default function Attributes({ object }: { object: AttioObject }) {
  const h = useAttio("listAttributes", async (slug: string) => (await listAttributes(slug)).data, [
    object.api_slug || "",
  ]);
  const { isLoading, data: attributes = [] } = h;

  const g = guard(h.guardInput(attributes.length > 0));
  if (g) return g;

  return (
    <List isLoading={isLoading} navigationTitle={`Objects / ${getObjectTitle(object)} / Attributes`}>
      {attributes.map((a: Attribute) => (
        <List.Item
          key={a.id.attribute_id}
          icon={ATTRIBUTE_ICONS[a.type] ?? Icon.QuestionMarkCircle}
          title={a.title}
          subtitle={a.type}
          accessories={[
            a.is_required ? { tag: { value: "Required", color: Color.Orange } } : {},
            {
              tag: a.is_writable
                ? { value: "Writable", color: Color.Green }
                : { value: "Read-only", color: Color.SecondaryText },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy API Slug" content={a.api_slug} />
              <Action.CopyToClipboard title="Copy Attribute ID" content={a.id.attribute_id} />
              <OpenInAttio route={`${object.api_slug || ""}/${a.api_slug}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
