// https://gist.github.com/brandonmcconnell/4a177fd6af7cffd4ca4808b3298b930c

const ordinalizeNumber = (n: number) => {
  const rule = new Intl.PluralRules("en-US", { type: "ordinal" }).select(n);
  const suffix = (
    {
      one: "st",
      two: "nd",
      few: "rd",
      other: "th",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  )[rule];
  return `${n}${suffix}`;
};

const getTimeSince = (
  _fromDate: number | Date,
  _toDate: number | Date,
  dateStringCap: number | undefined = undefined,
) => {
  const throwError = () => {
    throw new Error("getTimeSince requires 1-2 arguments, of type date or date-string");
  };
  if (
    typeof _fromDate === "undefined" ||
    isNaN(Number(_fromDate)) ||
    (typeof _toDate !== "undefined" && isNaN(Number(_toDate)))
  )
    throwError();
  const toPresent = _toDate === undefined || Math.abs(Number(_toDate) - Number(new Date())) < 50;
  const fromDate = Number(new Date(_fromDate));
  const toDate = Number(_toDate === undefined ? new Date() : new Date(_toDate ?? null));
  if (isNaN(fromDate) || isNaN(toDate)) throwError();

  const formatTimeSince = new Intl.RelativeTimeFormat("en", {
    localeMatcher: "best fit",
    style: "long",
    numeric: "auto",
  });

  const diff = fromDate - toDate;

  if (dateStringCap && !isNaN(dateStringCap) && Math.abs(diff) >= Number(dateStringCap)) {
    const [weekday, month, dateNumStr, year] = new Date(fromDate)
      .toLocaleString("en-us", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      .replace(/,/g, "")
      .split(" ");

    return `${weekday} ${month} ${ordinalizeNumber(Number(dateNumStr))}, ${year}`;
  }

  if (Math.abs(diff) < 1000) return toPresent ? "now" : "simultaneously";

  for (const [unit, value] of [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 31],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
  ] as const)
    if (Math.abs(diff) >= value) {
      const { sign, floor, ceil } = Math;
      let result = formatTimeSince.format((sign(diff) === 1 ? floor : ceil)(diff / value), unit);
      if (!toPresent)
        result = Math.sign(diff) === 1 ? result.replace("in ", "") + " later" : result.replace("ago", "prior");
      return result;
    }

  return "just now";
};

export default getTimeSince;
