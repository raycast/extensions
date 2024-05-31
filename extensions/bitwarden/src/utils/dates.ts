type GetFormattedDateOptions = Intl.DateTimeFormatOptions & {
  abbreviate?: boolean;
};

/**
 * Returns a date in the format `DD MMM YYYY, HH:mm:ss` (e.g. 18 Jan 2038, 23:59:59)
 * @param options.abbreviate Omits year if it's the current year and seconds if they are 0
 */
export const getFormattedDate = (date: Date, options?: GetFormattedDateOptions) => {
  const { abbreviate = false, ...dateOptions } = options ?? {};

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "numeric",
    year: abbreviate && date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    second: abbreviate && date.getSeconds() === 0 ? undefined : "numeric",
    ...dateOptions,
  });
};
