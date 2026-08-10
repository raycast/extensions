/**
 * Country information
 */
export type Country = {
  id: string;
  name: string;
  timezoneOffset: number; // UTC offset (e.g.: 9)
  timezoneName: string;
  ianaTimeZone: string;
};

/**
 * Date format
 */
export type Format = {
  id: string;
  name: string;
  /**
   * Function to generate a display string from date and country information
   */
  format: (date: Date, country: Country) => { name: string; value: string };
};

/**
 * Form values for convert-timestamp command
 */
export type ConvertTimestampFormValues = {
  unixTime: string;
  country: string;
  format: string;
};

/**
 * Form values for generate-timestamp command
 */
export type GenerateTimestampFormValues = {
  country: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};
