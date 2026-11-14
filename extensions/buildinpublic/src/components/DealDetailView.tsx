import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getDeal } from "../api";
import { Deal, DealDetail, DealOffer } from "../types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatValue(value: number) {
  return usd.format(value);
}

export function DealDetailView({ deal }: { deal: Deal }) {
  const { data: detail, isLoading } = useCachedPromise(getDeal, [deal.slug]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={deal.name}
      markdown={markdown(deal, detail)}
      metadata={
        <Detail.Metadata>
          {deal.value_usd != null && <Detail.Metadata.Label title="Value" text={formatValue(deal.value_usd)} />}
          {deal.category && <Detail.Metadata.Label title="Category" text={deal.category.name} />}
          {deal.requires_application && <Detail.Metadata.Label title="Access" text="By application" />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Get the deal" target={deal.deal_url} text="Build in Public" />
          {detail?.website_url && (
            <Detail.Metadata.Link title="Website" target={detail.website_url} text={hostname(detail.website_url)} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Get Deal on Build in Public" url={deal.deal_url} />
          {detail?.website_url && (
            <Action.OpenInBrowser title="Open Website" icon={Icon.Link} url={detail.website_url} />
          )}
          <Action.CopyToClipboard
            title="Copy Deal Link"
            content={deal.deal_url}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

function markdown(deal: Deal, detail?: DealDetail) {
  const sections = [`# ${deal.name}`];

  if (!detail) {
    if (deal.summary) sections.push(deal.summary);
    return sections.join("\n\n");
  }

  if (detail.offers.length > 1) {
    sections.push("## Offers", ...detail.offers.map(offer));
  } else if (detail.offers.length === 1) {
    sections.push(offer(detail.offers[0]));
  }

  if (detail.description) sections.push(`## About ${deal.name}`, detail.description);

  const features = detail.features.filter((feature) => feature.title || feature.text);
  if (features.length) {
    sections.push(
      "## Features",
      features.map((feature) => `- ${[bold(feature.title), feature.text].filter(Boolean).join(": ")}`).join("\n"),
    );
  }
  if (detail.pros.length) sections.push("## Pros", list(detail.pros));
  if (detail.cons.length) sections.push("## Cons", list(detail.cons));

  return sections.join("\n\n");
}

function offer(offer: DealOffer) {
  const notes = [
    offer.value_usd != null ? `Worth ${formatValue(offer.value_usd)}` : undefined,
    offer.requires_application ? "By application" : undefined,
    offer.verified_members_only ? "Verified members only" : undefined,
  ].filter(Boolean);

  return [
    `**${offer.summary ?? "Offer"}**`,
    notes.length ? notes.join(" · ") : undefined,
    offer.requirements.length ? list(offer.requirements) : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function list(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function bold(text: string | null) {
  return text ? `**${text}**` : undefined;
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
