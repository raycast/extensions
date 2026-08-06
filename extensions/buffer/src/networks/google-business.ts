import {
  toDateOnlyIso,
  combineDateAndTime,
  TIME_FORMAT_REGEX,
} from "../helpers/dateTime";
import type {
  GoogleBusinessButton,
  GoogleBusinessMetadata,
} from "../api/types";
import type { AttachmentRule, PostFormValues } from "./types";

export const GOOGLE_SERVICES = new Set([
  "google",
  "googlebusiness",
  "google_business",
]);

export const googleBusinessAttachmentRule: AttachmentRule = {
  allowed: ["none", "image"],
};

export const GOOGLE_BUTTONS: { value: GoogleBusinessButton; title: string }[] =
  [
    { value: "none", title: "None" },
    { value: "book", title: "Book" },
    { value: "order", title: "Order" },
    { value: "shop", title: "Shop" },
    { value: "learn_more", title: "Learn More" },
    { value: "signup", title: "Sign Up" },
    { value: "call", title: "Call" },
  ];

export function validateGoogleBusiness(values: PostFormValues): void {
  if (values.googlePostType === "offer") {
    if (!values.googleOfferStartDate || !values.googleOfferEndDate) {
      throw new Error("Offer start and end dates are required");
    }
    // Compare truncated calendar-date strings (rather than the raw Date objects, which may
    // carry an irrelevant time-of-day component) since offers only ever use the date part.
    if (
      toDateOnlyIso(values.googleOfferEndDate) <
      toDateOnlyIso(values.googleOfferStartDate)
    ) {
      throw new Error("Offer end date must not be before the start date");
    }
  }
  if (values.googlePostType === "event") {
    if (!values.googleEventStartDate || !values.googleEventEndDate) {
      throw new Error("Event start and end dates are required");
    }
    if (values.googleEventHasTime) {
      if (!values.googleEventStartTime || !values.googleEventEndTime) {
        throw new Error(
          'Please provide both an "Event Start Time" and "Event End Time", or disable "Specify Event Time" to create an all-day event.',
        );
      }
      if (
        !TIME_FORMAT_REGEX.test(values.googleEventStartTime) ||
        !TIME_FORMAT_REGEX.test(values.googleEventEndTime)
      ) {
        throw new Error(
          "Event times must be in 24-hour HH:mm format, e.g. 14:30.",
        );
      }
      // ISO timestamps of equal precision compare lexicographically in chronological order.
      if (
        combineDateAndTime(
          values.googleEventEndDate,
          values.googleEventEndTime,
        ) <=
        combineDateAndTime(
          values.googleEventStartDate,
          values.googleEventStartTime,
        )
      ) {
        throw new Error("Event end must be after the event start");
      }
    } else if (
      toDateOnlyIso(values.googleEventEndDate) <
      toDateOnlyIso(values.googleEventStartDate)
    ) {
      throw new Error("Event end date must not be before the start date");
    }
  }
}

export function buildGoogleBusinessMetadata(values: PostFormValues) {
  const google: GoogleBusinessMetadata = {
    type:
      (values.googlePostType as GoogleBusinessMetadata["type"]) ?? "whats_new",
  };

  if (google.type === "whats_new") {
    const details: GoogleBusinessMetadata["detailsWhatsNew"] = {};
    if (values.googleWhatsNewButton) {
      details.button = values.googleWhatsNewButton as GoogleBusinessButton;
    }
    if (values.googleWhatsNewLink) {
      details.link = values.googleWhatsNewLink;
    }
    google.detailsWhatsNew = details;
  } else if (
    google.type === "offer" &&
    values.googleOfferStartDate &&
    values.googleOfferEndDate
  ) {
    if (values.googleOfferTitle) {
      google.title = values.googleOfferTitle;
    }
    google.detailsOffer = {
      title: values.googleOfferTitle ?? "",
      // Google Business offers only support a calendar date, not a time of day
      startDate: toDateOnlyIso(values.googleOfferStartDate),
      endDate: toDateOnlyIso(values.googleOfferEndDate),
      ...(values.googleOfferCode ? { code: values.googleOfferCode } : {}),
      ...(values.googleOfferLink ? { link: values.googleOfferLink } : {}),
      ...(values.googleOfferTerms ? { terms: values.googleOfferTerms } : {}),
    };
  } else if (
    google.type === "event" &&
    values.googleEventStartDate &&
    values.googleEventEndDate
  ) {
    if (values.googleEventTitle) {
      google.title = values.googleEventTitle;
    }
    const hasTime = values.googleEventHasTime ?? false;
    google.detailsEvent = {
      title: values.googleEventTitle ?? "",
      // All-day events only support a calendar date, not a time of day; only when the user
      // opts in to "Specify Event Time" do we combine the date with a separate HH:mm time.
      startDate: hasTime
        ? combineDateAndTime(
            values.googleEventStartDate,
            values.googleEventStartTime ?? "",
          )
        : toDateOnlyIso(values.googleEventStartDate),
      endDate: hasTime
        ? combineDateAndTime(
            values.googleEventEndDate,
            values.googleEventEndTime ?? "",
          )
        : toDateOnlyIso(values.googleEventEndDate),
      isFullDayEvent: !hasTime,
      ...(values.googleEventButton
        ? { button: values.googleEventButton as GoogleBusinessButton }
        : {}),
      ...(values.googleEventLink ? { link: values.googleEventLink } : {}),
    };
  }

  return { google };
}
