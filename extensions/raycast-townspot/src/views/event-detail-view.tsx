import { Action, ActionPanel, Detail, Image } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  appleMapsUrl,
  EventDetails,
  fetchEventDetails,
  googleMapsUrl,
} from "../lib/event-details";
import { formatEventTime } from "../lib/event-listing";
import { splitEventTags } from "../lib/event-tags";
import { RaycastEvent } from "../types";

type EventDetailViewProps = {
  event: RaycastEvent;
  timezone: string;
  url: string;
  apiBaseUrl: string;
};

const parseDateValue = (value: string | undefined | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const formatClock = (value: Date | null, timezone: string): string => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
};

const formatDateLabel = (value: Date | null, timezone: string): string => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || "Europe/London",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(value);
};

const formatDateKey = (value: Date | null, timezone: string): string => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
};

const formatDateTime = (value: Date | null, timezone: string): string => {
  if (!value) return "TBC";
  const dayLabel = formatDateLabel(value, timezone);
  const timeLabel = formatClock(value, timezone);
  if (dayLabel && timeLabel) return `${dayLabel}, ${timeLabel}`;
  return dayLabel || timeLabel || "TBC";
};

const formatSpottedByDate = (value: Date | null, timezone: string): string => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || "Europe/London",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(value);
};

const formatTimeRange = (
  startValue: string | undefined | null,
  endValue: string | undefined | null,
  timezone: string,
): string => {
  const startDate = parseDateValue(startValue);
  const endDate = parseDateValue(endValue);
  const start = formatDateTime(startDate, timezone);
  if (!endDate) return start;

  const end = formatDateTime(endDate, timezone);
  if (start === "TBC") return end;
  if (end === "TBC") return start;
  if (startDate && endDate && startDate.getTime() === endDate.getTime()) return start;
  if (start === end) return start;

  const sameDay = formatDateKey(startDate, timezone) === formatDateKey(endDate, timezone);
  if (sameDay) {
    const dayLabel = formatDateLabel(startDate, timezone);
    const startClock = formatClock(startDate, timezone);
    const endClock = formatClock(endDate, timezone);
    if (dayLabel && startClock && endClock) {
      if (startClock === endClock) return `${dayLabel}, ${startClock}`;
      return `${dayLabel}, ${startClock} to ${endClock}`;
    }
    return start;
  }

  return `${start} to ${end}`;
};

const escapeMarkdown = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/([*_`[\\]()#+\-.!])/g, "\\$1");

const sanitizeDescription = (value: string | null): string | null => {
  if (!value) return null;
  const normalizedInput = value
    .replace(/(https?:\/\/)\s+/gi, "$1")
    .replace(/(https?:\/\/)\n+/gi, "$1");
  const lines = normalizedInput.split(/\r?\n/);
  const cleaned = lines.filter((line) => {
    const text = line.trim();
    if (!text) return true;
    if (/^open in (apple|google) maps/i.test(text)) return false;
    if (text.includes("|") && /open in (apple|google) maps/i.test(text)) return false;
    if (text.includes("🕒") || text.includes("📍") || text.includes("🧭") || text.includes("🏷")) return false;
    return true;
  });

  const normalized = cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return normalized || null;
};

const buildMarkdown = (
  title: string,
  description: string | null,
  spottedByMarkdown: string | null,
): string => {
  const blocks = [`# ${escapeMarkdown(title)}`];
  if (description) {
    blocks.push("", description);
  }
  if (spottedByMarkdown) {
    blocks.push("", spottedByMarkdown);
  }
  return blocks.join("\n");
};

const categoryList = (details: EventDetails | null, event: RaycastEvent): string[] => {
  const fallbackCategories = splitEventTags(event.tags).categories;
  const values = details?.categories?.length ? details.categories : fallbackCategories;
  return (values || []).filter(Boolean);
};

const fallbackVenue = (details: EventDetails | null, event: RaycastEvent): string => {
  return details?.locationName || details?.venueDescription || event.venueName || "TBC";
};

const fallbackAddress = (details: EventDetails | null): string => {
  return details?.locationAddress || details?.venueDescription || "";
};

const recurringLabel = (event: RaycastEvent): string | null => {
  const frequency = splitEventTags(event.tags).frequency;
  if (!frequency) return null;
  if (frequency.toLowerCase() === "one-off") return null;
  return `${frequency} recurring event`;
};

const priceLabel = (details: EventDetails | null): string | null => {
  const explicit = String(details?.priceInfo || "").trim();
  if (explicit) return explicit;
  if (details?.isFree === true) return "Free";
  if (details?.isFree === false) return "Paid";
  return null;
};

const spottedByLabel = (
  details: EventDetails | null,
  timezone: string,
): string => {
  const spottedBy = details?.spottedBy;
  const name = String(spottedBy?.name || "").trim() || "a local";
  const org = String(spottedBy?.org || "").trim();
  const spottedAt = parseDateValue(spottedBy?.spottedAt || details?.createdAt);
  const parts: string[] = [];

  if (org) parts.push(org);
  if (spottedBy?.isAreaAdmin) parts.push("Admin");

  const spottedDate = formatSpottedByDate(spottedAt, timezone);
  if (spottedDate) parts.push(spottedDate);

  return parts.length ? `${name} · ${parts.join(" · ")}` : name;
};

const spottedByMarkdown = (
  details: EventDetails | null,
  timezone: string,
): string | null => {
  void details;
  void timezone;
  return null;
};

const renderableAvatarUrl = (avatarUrl: string): string => {
  const trimmed = String(avatarUrl || "").trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";
  const safeOriginal = trimmed.replace(/"/g, "%22");

  // Use Supabase transform so markdown receives a square crop, avoiding squash.
  const objectPublicPath = "/storage/v1/object/public/";
  const renderPublicPath = "/storage/v1/render/image/public/";
  if (!safeOriginal.includes(objectPublicPath)) return safeOriginal;

  const transformed = safeOriginal.replace(objectPublicPath, renderPublicPath);
  const joiner = transformed.includes("?") ? "&" : "?";
  return `${transformed}${joiner}width=72&height=72&resize=cover`;
};

const spottedByAvatarIcon = (
  details: EventDetails | null,
): { source: string; mask: Image.Mask } | undefined => {
  const avatarUrl = renderableAvatarUrl(String(details?.spottedBy?.avatarUrl || "").trim());
  if (!avatarUrl) return undefined;
  return {
    source: avatarUrl,
    mask: Image.Mask.Circle,
  };
};

const buildShareMessage = (
  title: string,
  timeRangeLabel: string,
  venueLabel: string,
  url: string,
): string => {
  return `${title}\n${timeRangeLabel}\n📍 ${venueLabel}\n${url}`;
};

const EventMetadata = ({
  details,
  timezone,
  event,
  url,
}: {
  details: EventDetails | null;
  timezone: string;
  event: RaycastEvent;
  url: string;
}) => {
  const effectiveTimezone = details?.resolvedTimezone || details?.timezone || timezone;
  const startValue = details?.startTimeLocal || details?.startTime || event.startTime;
  const endValue = details?.endTimeLocal || details?.endTime || event.endTime;
  const timeRangeLabel = formatTimeRange(startValue, endValue, effectiveTimezone);
  const venueLabel = fallbackVenue(details, event);
  const addressLabel = fallbackAddress(details);
  const recurring = recurringLabel(event);
  const price = priceLabel(details);
  const categories = categoryList(details, event);
  const spottedBy = spottedByLabel(details, effectiveTimezone);
  const spottedByIcon = spottedByAvatarIcon(details);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="When" text={timeRangeLabel} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Where" text={venueLabel} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Spotted by" text={spottedBy} icon={spottedByIcon} />
      <Detail.Metadata.Separator />
      {addressLabel ? (
        <>
          <Detail.Metadata.Label title="Address" text={addressLabel} />
          <Detail.Metadata.Separator />
        </>
      ) : null}
      {recurring ? (
        <>
          <Detail.Metadata.Label title="Recurrence" text={recurring} />
          <Detail.Metadata.Separator />
        </>
      ) : null}
      {price ? (
        <>
          <Detail.Metadata.Label title="Price" text={price} />
          <Detail.Metadata.Separator />
        </>
      ) : null}
      {categories.length ? (
        <>
          <Detail.Metadata.TagList title="Categories">
            {categories.map((category) => (
              <Detail.Metadata.TagList.Item key={category} text={category} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
        </>
      ) : null}
      {details?.zoneName ? (
        <>
          <Detail.Metadata.Label title="Town" text={details.zoneName} />
          <Detail.Metadata.Separator />
        </>
      ) : null}
      <Detail.Metadata.Link title="TownSpot Link" target={url} text="Open listing" />
    </Detail.Metadata>
  );
};

export const EventDetailView = ({
  event,
  timezone,
  url,
  apiBaseUrl,
}: EventDetailViewProps) => {
  const [details, setDetails] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await fetchEventDetails(apiBaseUrl, event.id);
        if (cancelled) return;
        setDetails(payload);
      } catch (loadError) {
        if (cancelled) return;
        setDetails(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load event details");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, event.id]);

  const effectiveTimezone = details?.resolvedTimezone || details?.timezone || timezone;
  const startValue = details?.startTimeLocal || details?.startTime || event.startTime;
  const endValue = details?.endTimeLocal || details?.endTime || event.endTime;
  const venueLabel = fallbackVenue(details, event);
  const timeRangeLabel = formatTimeRange(startValue, endValue, effectiveTimezone);

  const mapsLabel = details?.locationName || details?.locationAddress || event.venueName;
  const hasCoordinates =
    typeof details?.lat === "number" &&
    Number.isFinite(details.lat) &&
    typeof details?.lng === "number" &&
    Number.isFinite(details.lng);

  const appleUrl = hasCoordinates
    ? appleMapsUrl(details.lat as number, details.lng as number, mapsLabel)
    : null;
  const googleUrl = hasCoordinates
    ? googleMapsUrl(details.lat as number, details.lng as number, mapsLabel)
    : null;

  const detailMarkdown = useMemo(() => {
    const description = sanitizeDescription(details?.description || null);
    const spottedBy = spottedByMarkdown(details, effectiveTimezone);
    return buildMarkdown(details?.title || event.title, description, spottedBy);
  }, [details, effectiveTimezone, event.title]);

  const legacyTimeLabel = formatEventTime(event.startTime, effectiveTimezone);
  const shareMessage = buildShareMessage(
    details?.title || event.title,
    timeRangeLabel,
    venueLabel,
    url,
  );
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  return (
    <Detail
      isLoading={loading}
      markdown={
        error
          ? `${detailMarkdown}\n\n---\n\n⚠️ Could not load full details (${error}).`
          : detailMarkdown
      }
      metadata={
        <EventMetadata details={details} timezone={effectiveTimezone} event={event} url={url} />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Quick Actions">
            <Action.OpenInBrowser
              title="Open on TownSpot"
              url={url}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.OpenInBrowser
              title="Share on WhatsApp"
              url={whatsappUrl}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            />
            {details?.sourceUrl ? (
              <Action.OpenInBrowser
                title="Open Source URL"
                url={details.sourceUrl}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
            ) : null}
          </ActionPanel.Section>
          {hasCoordinates ? (
            <ActionPanel.Section title="Maps">
              <Action.OpenInBrowser title="Open in Apple Maps" url={appleUrl as string} />
              <Action.OpenInBrowser title="Open in Google Maps" url={googleUrl as string} />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Share Message" content={shareMessage} />
            <Action.CopyToClipboard title="Copy Event Link" content={url} />
            <Action.CopyToClipboard title="Copy Event Name" content={event.title} />
            <Action.CopyToClipboard
              title="Copy Event Time"
              content={legacyTimeLabel || event.startLabel || "TBC"}
            />
            {details?.locationAddress ? (
              <Action.CopyToClipboard title="Copy Event Address" content={details.locationAddress} />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
