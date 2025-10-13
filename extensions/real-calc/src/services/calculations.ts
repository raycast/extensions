import { CalculationResult, FinancialIndexData } from "../types";
import { priceIndexCodes } from "../utils/constants";
import { formatNumber } from "../utils/formatting";

export function getIndexCode(indexName: string): string {
  return priceIndexCodes[indexName];
}

export function getConversionFactor(startDate: Date): number {
  const date = startDate.getTime();
  const dateRanges = [
    { start: new Date("1942-11-01").getTime(), end: new Date("1967-02-12").getTime(), factor: 1000 ** 5 * 2.75 },
    { start: new Date("1967-02-13").getTime(), end: new Date("1970-05-14").getTime(), factor: 1000 ** 4 * 2.75 },
    { start: new Date("1970-05-15").getTime(), end: new Date("1986-02-27").getTime(), factor: 1000 ** 4 * 2.75 },
    { start: new Date("1986-02-28").getTime(), end: new Date("1989-01-15").getTime(), factor: 1000 ** 3 * 2.75 },
    { start: new Date("1989-01-16").getTime(), end: new Date("1990-03-15").getTime(), factor: 1000 ** 2 * 2.75 },
    { start: new Date("1990-03-16").getTime(), end: new Date("1993-07-31").getTime(), factor: 1000 ** 2 * 2.75 },
    { start: new Date("1993-08-01").getTime(), end: new Date("1994-06-30").getTime(), factor: 1000 * 2.75 },
    { start: new Date("1994-07-01").getTime(), factor: 1 },
  ];

  for (const range of dateRanges) {
    if (date >= range.start && (!range.end || date <= range.end)) {
      return range.factor;
    }
  }

  throw new Error("Date out of range for conversion factor calculation");
}

export function calculateResult(
  financialValue: number,
  startDate: string,
  endDate: string,
  priceIndex: string,
  data: FinancialIndexData[],
): CalculationResult {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Invalid or empty data");
  }

  const [startDay, startMonth, startYear] = startDate.split("/").map(Number);
  const startDateObj = new Date(startYear, startMonth - 1, 1); // Set day to 1 to compare only month and year

  // Filter data to include only elements from the start month onwards
  const filteredData = data.filter((item) => {
    const [, itemMonth, itemYear] = item.data.split("/").map(Number);
    const itemDate = new Date(itemYear, itemMonth - 1, 1); // Set day to 1 to compare only month and year
    return itemDate >= startDateObj;
  });

  if (filteredData.length === 0) {
    throw new Error("No data available for the specified date range");
  }

  const indexes = filteredData.map((item: FinancialIndexData) => {
    if (typeof item.valor !== "string") {
      throw new Error("Invalid data format: 'valor' is not a string");
    }
    return 1 + parseFloat(item.valor) / 100;
  });

  const startDateDay = startDay;
  const startMonthDays = new Date(startYear, startMonth, 0).getDate();
  const startPassedDays = startMonthDays - startDateDay + 1;
  const firstIndex = Math.pow(indexes[0], startPassedDays / startMonthDays);

  indexes[0] = firstIndex;

  const [endDay, endMonth, endYear] = endDate.split("/").map(Number);
  const endMonthDays = new Date(endYear, endMonth, 0).getDate();

  const lastIndex = filteredData[filteredData.length - 1].data;
  const lastIndexDate = new Date(lastIndex.split("/").reverse().join("-"));
  const lastIndexMonth = lastIndexDate.getUTCMonth();
  const lastIndexYear = lastIndexDate.getUTCFullYear();

  if (new Date(lastIndexYear, lastIndexMonth) >= new Date(endYear, endMonth - 1)) {
    const lastIndex = Math.pow(indexes[indexes.length - 1], (endDay - 1) / endMonthDays);
    indexes[indexes.length - 1] = lastIndex;
  }

  const rawFactor = indexes.reduce((acc: number, curr: number) => acc * curr, 1);
  const conversionFactor = getConversionFactor(new Date(startYear, startMonth - 1, startDay));
  const adjustmentFactor = rawFactor / conversionFactor;
  const updatedValue = financialValue * adjustmentFactor;

  return {
    originalValue: formatNumber(financialValue, { style: "currency", currency: "BRL" }),
    updatedValue: formatNumber(updatedValue, { style: "currency", currency: "BRL" }),
    startDate,
    endDate,
    priceIndex,
    adjustmentFactor: formatNumber(adjustmentFactor, { minimumFractionDigits: 10, maximumFractionDigits: 10 }),
    percentageChange: formatNumber(adjustmentFactor - 1, { style: "percent", minimumFractionDigits: 2 }),
    data: filteredData,
  };
}

export function calculateAdjustmentFactors(
  startDates: string[],
  endDate: string,
  data: FinancialIndexData[],
): number[] {
  return startDates.map((startDate) => {
    const indexes = data.map((item) => {
      return 1 + parseFloat(item.valor) / 100;
    });

    const startIndex = data.findIndex((item) => {
      const [itemMonth, itemYear] = item.data.split("/").slice(1);
      const [startMonth, startYear] = startDate.split("/").slice(1);
      return itemMonth === startMonth && itemYear === startYear;
    });

    const [startDay, startMonth, startYear] = startDate.split("/").map(Number);
    const startDateObj = new Date(startYear, startMonth - 1, startDay);
    const startMonthDays = new Date(startYear, startMonth, 0).getDate();
    const startPassedDays = startMonthDays - startDay + 1;

    const indexesCopy = indexes.slice(startIndex);
    const firstIndex = Math.pow(indexesCopy[0], startPassedDays / startMonthDays);
    indexesCopy[0] = firstIndex;

    const [endDay, endMonth, endYear] = endDate.split("/").map(Number);
    const endMonthDays = new Date(endYear, endMonth, 0).getDate();

    const lastIndex = data[data.length - 1].data;
    const lastIndexDate = new Date(lastIndex.split("/").reverse().join("-"));
    const lastIndexMonth = lastIndexDate.getUTCMonth();
    const lastIndexYear = lastIndexDate.getUTCFullYear();

    if (new Date(lastIndexYear, lastIndexMonth) >= new Date(endYear, endMonth - 1)) {
      const lastIndex = Math.pow(indexesCopy[indexesCopy.length - 1], (endDay - 1) / endMonthDays);
      indexesCopy[indexesCopy.length - 1] = lastIndex;
    }

    return indexesCopy.reduce((acc, curr) => acc * curr, 1) / getConversionFactor(startDateObj);
  });
}
