import { z } from "zod";

/**
 * Parcel's API is third-party, unversioned, and has changed shape without notice, so responses are
 * validated here. `looseObject` is used throughout: unknown fields must survive parsing because the AI
 * tools spread deliveries and events straight into their output.
 *
 * This module must not import `@raycast/api`, so the schemas stay testable outside the Raycast runtime.
 */

export class ParcelSchemaError extends Error {
  constructor(cause?: z.ZodError) {
    super("Parcel returned an unexpected response. The extension may need an update.", { cause });
    this.name = "ParcelSchemaError";
  }
}

/**
 * The thrown message is what the user reads, so the field-level detail goes to the console instead.
 * `error` is absent when the response was well-formed but said something the extension cannot use.
 */
function fail(context: string, error?: z.ZodError): never {
  console.error(error ? `${context}:\n${z.prettifyError(error)}` : context);
  throw new ParcelSchemaError(error);
}

/**
 * A 2xx response can still carry an HTML error page from a proxy, so the body is decoded here rather
 * than by `response.json()`, whose `SyntaxError` would surface as the internal error this module exists
 * to keep out of the UI.
 */
export function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    fail("Response body was not JSON");
  }
}

/**
 * Parcel omits some fields and sends others as an explicit `null`. Both mean absent, so both normalize
 * to `undefined` rather than failing the record they sit on.
 */
function optional<T extends z.ZodType>(schema: T) {
  return schema.nullish().transform((value) => value ?? undefined);
}

type ItemResult<T> = { success: true; data: T } | { success: false; error: z.ZodError };

/**
 * Keep the items that parsed, count the ones that did not, and fail closed when a non-empty input
 * yielded nothing. That last case is what separates one malformed record from a changed format.
 */
function keepParsable<TIn, TOut>(
  items: TIn[],
  parse: (item: TIn) => ItemResult<TOut>,
  noun: { one: string; many: string },
): TOut[] {
  const kept: TOut[] = [];
  let firstError: z.ZodError | undefined;

  for (const item of items) {
    const result = parse(item);
    if (result.success) {
      kept.push(result.data);
      continue;
    }
    firstError ??= result.error;
  }

  const dropped = items.length - kept.length;
  if (firstError && kept.length === 0) {
    fail(`Every ${noun.one} Parcel returned was in an unexpected shape`, firstError);
  }
  if (dropped > 0) {
    console.warn(`Dropped ${dropped} ${dropped === 1 ? noun.one : noun.many} in an unexpected shape`);
  }

  return kept;
}

/**
 * `supported_carriers.json` mapped each code to a name string until 2026 and maps it to an object now.
 * Both shapes are accepted so a revert upstream does not break the extension a second time.
 */
const CarrierEntry = z
  .tuple([z.string(), z.union([z.string().transform((name) => ({ name })), z.looseObject({ name: z.string() })])])
  .transform(([code, value]) => ({ code, name: value.name }));

const CarriersEnvelope = z.record(z.string(), z.unknown());

const EventSchema = z.looseObject({
  event: z.string(),
  date: z.string(),
  location: optional(z.string()),
  additional: optional(z.string()),
});

/**
 * Events are validated individually and a malformed one is dropped, so a single unparseable tracking
 * scan does not cost the whole delivery. Absent and null both read as no events, since a carrier that
 * has reported nothing yet should still show up in the list.
 */
const EventList = z
  .array(z.unknown())
  .nullish()
  .transform((items) =>
    (items ?? []).flatMap((item) => {
      const event = EventSchema.safeParse(item);
      if (!event.success) {
        console.warn("Dropped a tracking event Parcel returned in an unexpected shape");
        return [];
      }
      return [event.data];
    }),
  );

const DeliverySchema = z.looseObject({
  carrier_code: z.string(),
  description: z.string(),
  status_code: z.number(),
  tracking_number: z.string(),
  events: EventList,
  extra_information: optional(z.string()),
  date_expected: optional(z.string()),
  date_expected_end: optional(z.string()),
  timestamp_expected: optional(z.number()),
  timestamp_expected_end: optional(z.number()),
});

/** Just enough of any response body to prefer Parcel's own message over an HTTP status. */
const ErrorBody = z.looseObject({ error_message: optional(z.string()) });

/**
 * Parcel's own message for a failed request, or undefined when the body carries none. A non-JSON body
 * is a proxy's error page rather than Parcel's, so the caller's HTTP-status fallback describes it better
 * than its markup would.
 */
export function errorMessage(body: string): string | undefined {
  try {
    const parsed = ErrorBody.safeParse(JSON.parse(body));
    return parsed.success ? parsed.data.error_message || undefined : undefined;
  } catch {
    return undefined;
  }
}

/** What every endpoint answers with. Add Delivery returns this and nothing else. */
const StatusEnvelope = z.looseObject({
  success: z.boolean(),
  error_message: optional(z.string()),
});

/**
 * `deliveries` is optional despite the docs listing it as always provided: error responses omit it.
 * Deliveries are held as `unknown` here so the envelope can succeed while an individual item fails.
 */
const DeliveriesEnvelope = StatusEnvelope.extend({
  deliveries: optional(z.array(z.unknown())),
});

export type Carrier = z.infer<typeof CarrierEntry>;
export type Event = z.infer<typeof EventSchema>;
export type Delivery = z.infer<typeof DeliverySchema>;

export interface ParcelApiResponse {
  success: boolean;
  error_message?: string;
  deliveries?: Delivery[];
}

/** The shape both endpoints share, and all `getAPIError` needs to read. */
export type ParcelApiStatus = Pick<ParcelApiResponse, "success" | "error_message">;

export function parseAddDelivery(json: unknown): ParcelApiStatus {
  const envelope = StatusEnvelope.safeParse(json);
  if (!envelope.success) {
    fail("Unexpected add delivery response", envelope.error);
  }
  return envelope.data;
}

export function parseCarriers(json: unknown): Carrier[] {
  const envelope = CarriersEnvelope.safeParse(json);
  if (!envelope.success) {
    fail("Unexpected carrier list", envelope.error);
  }

  const carriers = keepParsable(Object.entries(envelope.data), (entry) => CarrierEntry.safeParse(entry), {
    one: "carrier",
    many: "carriers",
  });

  return carriers.sort((a, b) => a.name.localeCompare(b.name));
}

export function parseDeliveries(json: unknown): ParcelApiResponse {
  const envelope = DeliveriesEnvelope.safeParse(json);
  if (!envelope.success) {
    fail("Unexpected deliveries response", envelope.error);
  }

  const { deliveries: raw, ...rest } = envelope.data;
  if (!raw) {
    // Absent on the error envelope, which is the documented contract being wrong rather than a failure.
    // Absent on a success envelope means the field was renamed or moved, and reporting no packages at
    // all would be a confident wrong answer, so that fails closed.
    if (rest.success) {
      fail("Deliveries response was missing its deliveries");
    }
    return rest;
  }

  const deliveries = keepParsable(raw, (item) => DeliverySchema.safeParse(item), {
    one: "delivery",
    many: "deliveries",
  });

  return { ...rest, deliveries };
}
