import { describe, it, expect } from "vitest";
import {
  validateGoogleBusiness,
  buildGoogleBusinessMetadata,
} from "./google-business";
import type { PostFormValues } from "./types";

const base: PostFormValues = {
  channelId: "chan1",
  text: "",
  mode: "shareNow",
  attachmentType: "none",
};

describe("validateGoogleBusiness", () => {
  it("does not require dates for What's New posts", () => {
    expect(() =>
      validateGoogleBusiness({ ...base, googlePostType: "whats_new" }),
    ).not.toThrow();
  });

  it("throws when an Offer is missing start/end dates", () => {
    expect(() =>
      validateGoogleBusiness({ ...base, googlePostType: "offer" }),
    ).toThrow("Offer start and end dates are required");
  });

  it("passes when an Offer has both dates", () => {
    expect(() =>
      validateGoogleBusiness({
        ...base,
        googlePostType: "offer",
        googleOfferStartDate: new Date("2026-01-01"),
        googleOfferEndDate: new Date("2026-01-31"),
      }),
    ).not.toThrow();
  });

  it("throws when an Offer end date is before the start date", () => {
    expect(() =>
      validateGoogleBusiness({
        ...base,
        googlePostType: "offer",
        googleOfferStartDate: new Date("2026-01-31"),
        googleOfferEndDate: new Date("2026-01-01"),
      }),
    ).toThrow("Offer end date must not be before the start date");
  });

  it("passes when an Offer's start and end date are the same day", () => {
    expect(() =>
      validateGoogleBusiness({
        ...base,
        googlePostType: "offer",
        googleOfferStartDate: new Date(2026, 0, 15, 8, 0),
        googleOfferEndDate: new Date(2026, 0, 15, 20, 0),
      }),
    ).not.toThrow();
  });

  it("throws when an Event is missing start/end dates", () => {
    expect(() =>
      validateGoogleBusiness({ ...base, googlePostType: "event" }),
    ).toThrow("Event start and end dates are required");
  });

  it("does not require start/end times for an Event when Specify Event Time is off", () => {
    expect(() =>
      validateGoogleBusiness({
        ...base,
        googlePostType: "event",
        googleEventStartDate: new Date("2026-07-01T10:00:00Z"),
        googleEventEndDate: new Date("2026-07-01T18:00:00Z"),
      }),
    ).not.toThrow();
  });

  it("throws when Specify Event Time is on but start or end time is missing", () => {
    expect(() =>
      validateGoogleBusiness({
        ...base,
        googlePostType: "event",
        googleEventStartDate: new Date("2026-07-01T10:00:00Z"),
        googleEventEndDate: new Date("2026-07-01T18:00:00Z"),
        googleEventHasTime: true,
        googleEventStartTime: "10:00",
      }),
    ).toThrow(
      'Please provide both an "Event Start Time" and "Event End Time", or disable "Specify Event Time" to create an all-day event.',
    );
  });

  it("throws when an all-day Event's end date is before the start date", () => {
    expect(() =>
      validateGoogleBusiness({
        ...base,
        googlePostType: "event",
        googleEventStartDate: new Date(2026, 6, 10),
        googleEventEndDate: new Date(2026, 6, 1),
      }),
    ).toThrow("Event end date must not be before the start date");
  });

  it("passes when an all-day Event's start and end date are the same day", () => {
    expect(() =>
      validateGoogleBusiness({
        ...base,
        googlePostType: "event",
        googleEventStartDate: new Date(2026, 6, 1, 8, 0),
        googleEventEndDate: new Date(2026, 6, 1, 20, 0),
      }),
    ).not.toThrow();
  });

  it("throws when a timed Event's end is not after its start", () => {
    expect(() =>
      validateGoogleBusiness({
        ...base,
        googlePostType: "event",
        googleEventStartDate: new Date(2026, 6, 1),
        googleEventEndDate: new Date(2026, 6, 1),
        googleEventHasTime: true,
        googleEventStartTime: "18:00",
        googleEventEndTime: "10:00",
      }),
    ).toThrow("Event end must be after the event start");
  });

  it("throws when a timed Event's end equals its start", () => {
    expect(() =>
      validateGoogleBusiness({
        ...base,
        googlePostType: "event",
        googleEventStartDate: new Date(2026, 6, 1),
        googleEventEndDate: new Date(2026, 6, 1),
        googleEventHasTime: true,
        googleEventStartTime: "10:00",
        googleEventEndTime: "10:00",
      }),
    ).toThrow("Event end must be after the event start");
  });

  it("throws when an Event time is not in 24-hour HH:mm format", () => {
    expect(() =>
      validateGoogleBusiness({
        ...base,
        googlePostType: "event",
        googleEventStartDate: new Date("2026-07-01T10:00:00Z"),
        googleEventEndDate: new Date("2026-07-01T18:00:00Z"),
        googleEventHasTime: true,
        googleEventStartTime: "10am",
        googleEventEndTime: "18:00",
      }),
    ).toThrow("Event times must be in 24-hour HH:mm format, e.g. 14:30.");
  });

  it("passes when Specify Event Time is on with valid start/end times", () => {
    expect(() =>
      validateGoogleBusiness({
        ...base,
        googlePostType: "event",
        googleEventStartDate: new Date("2026-07-01T10:00:00Z"),
        googleEventEndDate: new Date("2026-07-01T18:00:00Z"),
        googleEventHasTime: true,
        googleEventStartTime: "10:00",
        googleEventEndTime: "18:00",
      }),
    ).not.toThrow();
  });
});

describe("buildGoogleBusinessMetadata", () => {
  it("builds What's New metadata with a button and link", () => {
    expect(
      buildGoogleBusinessMetadata({
        ...base,
        googlePostType: "whats_new",
        googleWhatsNewButton: "book",
        googleWhatsNewLink: "https://example.com",
      }),
    ).toEqual({
      google: {
        type: "whats_new",
        detailsWhatsNew: { button: "book", link: "https://example.com" },
      },
    });
  });

  it("truncates Offer dates to calendar-date-only ISO strings", () => {
    const result = buildGoogleBusinessMetadata({
      ...base,
      googlePostType: "offer",
      googleOfferTitle: "Big Sale",
      googleOfferStartDate: new Date(2026, 2, 15, 14, 30),
      googleOfferEndDate: new Date(2026, 2, 20, 9, 0),
      googleOfferCode: "SAVE20",
    });

    expect(result).toEqual({
      google: {
        type: "offer",
        title: "Big Sale",
        detailsOffer: {
          title: "Big Sale",
          startDate: "2026-03-15T00:00:00.000Z",
          endDate: "2026-03-20T00:00:00.000Z",
          code: "SAVE20",
        },
      },
    });
  });

  it("defaults to an all-day event and truncates the date when Specify Event Time is off", () => {
    const result = buildGoogleBusinessMetadata({
      ...base,
      googlePostType: "event",
      googleEventTitle: "Conference",
      googleEventStartDate: new Date(2026, 2, 15, 14, 30),
      googleEventEndDate: new Date(2026, 2, 16, 9, 0),
    });

    expect(result.google?.detailsEvent).toEqual({
      title: "Conference",
      startDate: "2026-03-15T00:00:00.000Z",
      endDate: "2026-03-16T00:00:00.000Z",
      isFullDayEvent: true,
    });
  });

  it("combines the date and time when Specify Event Time is on", () => {
    const result = buildGoogleBusinessMetadata({
      ...base,
      googlePostType: "event",
      googleEventTitle: "Launch Party",
      googleEventStartDate: new Date(2026, 2, 15, 14, 30),
      googleEventEndDate: new Date(2026, 2, 15, 23, 0),
      googleEventHasTime: true,
      googleEventStartTime: "10:00",
      googleEventEndTime: "18:00",
    });

    expect(result.google?.detailsEvent).toEqual({
      title: "Launch Party",
      startDate: new Date(2026, 2, 15, 10, 0).toISOString(),
      endDate: new Date(2026, 2, 15, 18, 0).toISOString(),
      isFullDayEvent: false,
    });
  });
});
