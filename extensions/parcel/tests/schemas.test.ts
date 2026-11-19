import { afterEach, describe, expect, it, vi } from "vitest";
import { ParcelSchemaError, errorMessage, parseAddDelivery, parseCarriers, parseDeliveries, parseJson } from "../src/schemas";

afterEach(() => {
  vi.restoreAllMocks();
});

function silenceConsole() {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  return { warn, error };
}

/** A success envelope in the shape the live API returned on 2026-08-28. */
const successEnvelope = {
  success: true,
  deliveries: [
    {
      carrier_code: "ups",
      description: "Desk Organizer Set",
      status_code: 2,
      tracking_number: "1Z999AA10123456784",
      events: [{ event: "Out for delivery", date: "Wednesday, 14 March 10:30 AM", location: "Seattle, WA" }],
    },
  ],
};

describe("parseCarriers", () => {
  it("reads the nested shape the API returns today", () => {
    const carriers = parseCarriers({
      ups: { name: "UPS", extra_required: 1, name_variations: { en: "UPS" } },
      abf: { name: "ABF Freight" },
    });

    expect(carriers).toEqual([
      { code: "abf", name: "ABF Freight" },
      { code: "ups", name: "UPS" },
    ]);
  });

  it("still reads the legacy flat shape, so a revert upstream keeps working", () => {
    expect(parseCarriers({ ups: "UPS", abf: "ABF Freight" })).toEqual([
      { code: "abf", name: "ABF Freight" },
      { code: "ups", name: "UPS" },
    ]);
  });

  it("reads a payload that mixes both shapes", () => {
    expect(parseCarriers({ ups: "UPS", abf: { name: "ABF Freight" } })).toEqual([
      { code: "abf", name: "ABF Freight" },
      { code: "ups", name: "UPS" },
    ]);
  });

  it("drops a malformed entry and keeps the rest", () => {
    const { warn } = silenceConsole();

    expect(parseCarriers({ ups: { name: "UPS" }, broken: { label: "No name here" } })).toEqual([
      { code: "ups", name: "UPS" },
    ]);
    expect(warn).toHaveBeenCalled();
  });

  it("throws when every entry is malformed, the failure mode that shipped as a TypeError", () => {
    silenceConsole();

    expect(() => parseCarriers({ ups: { label: "UPS" }, abf: { label: "ABF Freight" } })).toThrow(ParcelSchemaError);
  });
});

describe("parseDeliveries", () => {
  it("reads a success envelope", () => {
    const parsed = parseDeliveries(successEnvelope);

    expect(parsed.success).toBe(true);
    expect(parsed.deliveries).toHaveLength(1);
    expect(parsed.deliveries?.[0].tracking_number).toBe("1Z999AA10123456784");
  });

  it("reads an error envelope that omits deliveries, which the docs claim cannot happen", () => {
    const parsed = parseDeliveries({ success: false, error_message: "No API key provided" });

    expect(parsed.success).toBe(false);
    expect(parsed.error_message).toBe("No API key provided");
    expect(parsed.deliveries).toBeUndefined();
  });

  it("keeps unknown fields on the envelope itself", () => {
    const parsed = parseDeliveries({ success: true, deliveries: [], server_time: "2026-08-28T00:00:00Z" });

    expect(parsed).toMatchObject({ server_time: "2026-08-28T00:00:00Z" });
  });

  it("keeps unknown fields so the AI tools can pass them through", () => {
    const parsed = parseDeliveries({
      success: true,
      deliveries: [{ ...successEnvelope.deliveries[0], carrier_promises_a_llama: true }],
    });

    expect(parsed.deliveries?.[0].carrier_promises_a_llama).toBe(true);
  });

  it("reads a delivery that omits date_expected, as every delivery in the live probe did", () => {
    const parsed = parseDeliveries(successEnvelope);

    expect("date_expected" in successEnvelope.deliveries[0]).toBe(false);
    expect(parsed.deliveries?.[0].date_expected).toBeUndefined();
  });

  it("reads a null optional field as absent rather than failing the record it sits on", () => {
    const parsed = parseDeliveries({
      success: true,
      error_message: null,
      deliveries: [
        {
          ...successEnvelope.deliveries[0],
          date_expected: null,
          timestamp_expected: null,
          events: [{ ...successEnvelope.deliveries[0].events[0], location: null }],
        },
      ],
    });

    expect(parsed.error_message).toBeUndefined();
    expect(parsed.deliveries).toHaveLength(1);
    expect(parsed.deliveries?.[0].date_expected).toBeUndefined();
    expect(parsed.deliveries?.[0].timestamp_expected).toBeUndefined();
    expect(parsed.deliveries?.[0].events[0].location).toBeUndefined();
  });

  it("drops a malformed event and keeps the delivery", () => {
    silenceConsole();

    const parsed = parseDeliveries({
      success: true,
      deliveries: [
        {
          ...successEnvelope.deliveries[0],
          events: [{ event: "Picked up", date: 1742000000 }, successEnvelope.deliveries[0].events[0]],
        },
      ],
    });

    expect(parsed.deliveries).toHaveLength(1);
    expect(parsed.deliveries?.[0].events).toEqual([successEnvelope.deliveries[0].events[0]]);
  });

  it("drops a malformed delivery and keeps the rest", () => {
    const { warn } = silenceConsole();

    const parsed = parseDeliveries({
      success: true,
      deliveries: [{ carrier_code: "ups" }, successEnvelope.deliveries[0]],
    });

    expect(parsed.deliveries).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
  });

  it.each([null, undefined])("treats events: %s as no events rather than dropping the delivery", (events) => {
    silenceConsole();

    const parsed = parseDeliveries({
      success: true,
      deliveries: [{ ...successEnvelope.deliveries[0], events }],
    });

    expect(parsed.deliveries).toHaveLength(1);
    expect(parsed.deliveries?.[0].events).toEqual([]);
  });

  it.each([{}, { deliveries: null }])(
    "throws when a success envelope carries no deliveries (%o), rather than reporting an empty list",
    (deliveries) => {
      silenceConsole();

      expect(() => parseDeliveries({ success: true, ...deliveries })).toThrow(ParcelSchemaError);
    },
  );

  it("throws when every delivery is malformed, which means the format changed", () => {
    silenceConsole();

    expect(() => parseDeliveries({ success: true, deliveries: [{ carrier_code: "ups" }] })).toThrow(ParcelSchemaError);
  });

  it("throws on an envelope it cannot read at all", () => {
    silenceConsole();

    expect(() => parseDeliveries("service unavailable")).toThrow(ParcelSchemaError);
  });
});

describe("parseAddDelivery", () => {
  it("reads a success response without demanding a deliveries array", () => {
    expect(parseAddDelivery({ success: true })).toEqual({ success: true });
  });

  it("reads an error response", () => {
    expect(parseAddDelivery({ success: false, error_message: "Invalid tracking number" })).toEqual({
      success: false,
      error_message: "Invalid tracking number",
    });
  });
});

describe("parseJson", () => {
  it("reads a JSON body", () => {
    expect(parseJson('{"success":true}')).toEqual({ success: true });
  });

  it.each([
    ["an HTML error page a proxy returned with a 200", "<html><body>502</body></html>"],
    ["an empty body", ""],
  ])("throws on %s rather than letting a SyntaxError reach the user", (_name, body) => {
    silenceConsole();

    expect(() => parseJson(body)).toThrow(ParcelSchemaError);
  });
});

describe("errorMessage", () => {
  it("prefers Parcel's own message", () => {
    expect(errorMessage('{"success":false,"error_message":"No API key provided"}')).toBe("No API key provided");
  });

  it.each([
    ["a JSON body carrying no message", '{"success":false}'],
    ["an empty message", '{"error_message":""}'],
    ["a null message", '{"error_message":null}'],
    ["an HTML error page, whose markup would read worse than the HTTP status", "<html>502 Bad Gateway</html>"],
  ])("falls back to the caller's status text for %s", (_name, body) => {
    expect(errorMessage(body)).toBeUndefined();
  });
});
