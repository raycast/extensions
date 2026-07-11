import { z } from "zod";

const ForecastSummarySchema = z.looseObject({
  symbol_code: z.string().optional(),
});

const ForecastDetailsSchema = z.looseObject({
  precipitation_amount: z.number().optional(),
});

const ForecastPeriodSchema = z.looseObject({
  summary: ForecastSummarySchema.optional(),
  details: ForecastDetailsSchema.optional(),
});

const InstantDetailsSchema = z.looseObject({
  air_temperature: z.number().optional(),
  wind_speed: z.number().optional(),
  wind_from_direction: z.number().optional(),
});

export const TimeseriesEntrySchema = z.looseObject({
  time: z.string(),
  data: z.looseObject({
    instant: z.looseObject({
      details: InstantDetailsSchema,
    }),
    next_1_hours: ForecastPeriodSchema.optional(),
    next_6_hours: ForecastPeriodSchema.optional(),
    next_12_hours: ForecastPeriodSchema.optional(),
  }),
});

export const LocationForecastResponseSchema = z.looseObject({
  properties: z
    .looseObject({
      timeseries: z.array(TimeseriesEntrySchema).optional(),
    })
    .optional(),
  meta: z
    .looseObject({
      updated_at: z.string().optional(),
    })
    .optional(),
});

const SunrisePropertySchema = z.looseObject({
  time: z.string().optional(),
});

export const SunriseApiResponseSchema = z.looseObject({
  properties: z
    .looseObject({
      sunrise: SunrisePropertySchema.optional(),
      sunset: SunrisePropertySchema.optional(),
    })
    .optional(),
});

export const SunTimesSchema = z.looseObject({
  sunrise: z.string().optional(),
  sunset: z.string().optional(),
});

export const NominatimRawResultSchema = z.looseObject({
  place_id: z.union([z.number(), z.string()]),
  display_name: z.string(),
  lat: z.string(),
  lon: z.string(),
  address: z
    .looseObject({
      city: z.string().optional(),
      town: z.string().optional(),
      municipality: z.string().optional(),
      county: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      country_code: z.string().optional(),
      postcode: z.string().optional(),
    })
    .optional(),
  osm_type: z.string().optional(),
  type: z.string().optional(),
  class: z.string().optional(),
  addresstype: z.string().optional(),
});

export const NominatimRawSearchResponseSchema = z.array(NominatimRawResultSchema);

export const LocationResultSchema = z.looseObject({
  id: z.string(),
  displayName: z.string(),
  lat: z.number(),
  lon: z.number(),
  address: z
    .looseObject({
      city: z.string().optional(),
      town: z.string().optional(),
      municipality: z.string().optional(),
      county: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      country_code: z.string().optional(),
      postcode: z.string().optional(),
    })
    .optional(),
  osm_type: z.string().optional(),
  type: z.string().optional(),
  class: z.string().optional(),
  addresstype: z.string().optional(),
});

export type TimeseriesEntry = z.infer<typeof TimeseriesEntrySchema>;
export type SunTimes = z.infer<typeof SunTimesSchema>;
export type LocationResult = z.infer<typeof LocationResultSchema>;
