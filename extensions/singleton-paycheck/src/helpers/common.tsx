import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  getBusinessDaysInMonth,
  getBusinessDaysUntilEndOfMonth,
  getBusinessDaysUntilNow,
  getTotalSeconds,
  requestEntries,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "./toggl";
import { Color, Detail } from "@raycast/api";
import moment from "moment";
import ErrorActions from "../components/ErrorActions";

const calculateNonTaxableAmount = (bruttoYear: number) => {
  if (bruttoYear <= 654 * 12) {
    return 7848;
  } else if (bruttoYear < 25200) {
    return 7848 - (7848 / 10800) * (bruttoYear - 14400);
  }
  return 0;
};

const percent = (number: number, percent: number) => {
  return (number * percent) / 100;
};

const getNettoYearValue = (brutto: number) => {
  const bruttoYear = brutto * 12;

  const nonTaxablePerYear = calculateNonTaxableAmount(bruttoYear);
  const nonTaxablePerMonth = nonTaxablePerYear > 0 ? nonTaxablePerYear / 12 : 0;
  const taxableSum =
    brutto < nonTaxablePerMonth ? 0 : brutto - nonTaxablePerMonth;
  const pensionTax = percent(brutto, 2);
  const socialInsuranceTax = percent(brutto, 1.6);
  const incomeTax = taxableSum * 0.2;

  return brutto - pensionTax - socialInsuranceTax - incomeTax;
};

const getNettoMonthValue = (brutto: number) => {
  return getNettoYearValue(brutto * 12) / 12;
};

const getToggleEntries = async (hourRate: number, targetHours: number) => {
  const togglBaseUrl = "https://api.track.toggl.com/api/v9";
  const requestPath = `/me/time_entries?start_date=${startOfWeek}&end_date=${endOfWeek}`;

  const todayRequestPath = `/me/time_entries?start_date=${startOfDay}&end_date=${endOfDay}`;
  const thisMonthRequestPath = `/me/time_entries?start_date=${startOfMonth}&end_date=${endOfMonth}`;

  const thisMonthRequestUrl = `${togglBaseUrl}${thisMonthRequestPath}`;
  const todayRequestUrl = `${togglBaseUrl}${todayRequestPath}`;
  const requestUrl = `${togglBaseUrl}${requestPath}`;

  const hourRateNetto = getNettoMonthValue(hourRate * 160) / 160;

  const loggedEntries = await requestEntries(requestUrl);
  const totalSeconds = getTotalSeconds(loggedEntries);
  const hours = totalSeconds / (60 * 60);

  const todayEntries = await requestEntries(todayRequestUrl);
  const todayTotalSeconds = getTotalSeconds(todayEntries);
  const todayHours = todayTotalSeconds / (60 * 60);

  const thisMonthEntries = await requestEntries(thisMonthRequestUrl);
  const thisMonthTotalSeconds = getTotalSeconds(thisMonthEntries);
  const thisMonthHours = thisMonthTotalSeconds / (60 * 60);

  const currentBusinessDays = getBusinessDaysUntilNow;
  const monthBusinessDays = getBusinessDaysInMonth;
  const currentAverage = thisMonthHours / currentBusinessDays;
  const targetAverage = targetHours / monthBusinessDays;

  const remainingBusinessDays = getBusinessDaysUntilEndOfMonth;
  const remainingHours = targetHours - thisMonthHours;
  const remainingAverage = remainingHours / remainingBusinessDays;

  const moneyEarnedBrutto = hourRate * thisMonthHours;
  const moneyEarnedNetto = hourRateNetto * thisMonthHours;
  const salaryTargetBrutto = targetHours * hourRate;
  const salaryTargetNetto = targetHours * hourRateNetto;

  return {
    thisMonthHours,
    todayHours,
    currentAverage,
    targetAverage,
    remainingAverage,
    moneyEarnedBrutto,
    moneyEarnedNetto,
    salaryTargetBrutto,
    salaryTargetNetto,
    hourRateNetto,
  };
};

export const statusLine = () => {
  // Todo: Implement correct status
  const timebaseColor = Color.Yellow;
  const togglTrackColor = Color.Green;

  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Services status">
        <Detail.Metadata.TagList.Item
          text="Timebase - Set up in settings"
          color={timebaseColor}
        />
        <Detail.Metadata.TagList.Item
          text="Toggl Track - Active"
          color={togglTrackColor}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link
        title="Open in browser"
        target="https://timebase.app/dashboard"
        text="Timebase"
      />
      <Detail.Metadata.Link
        title=""
        target="https://track.toggl.com/timer"
        text="Toggl track"
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title={`Last time updated: ${moment().format("HH:mm:ss, DD.MM.YYYY")}`}
      />
    </Detail.Metadata>
  );
};

export const result = async (hourRate: number, targetHours: number) => {
  const {
    thisMonthHours,
    todayHours,
    currentAverage,
    targetAverage,
    remainingAverage,
    moneyEarnedBrutto,
    moneyEarnedNetto,
    salaryTargetBrutto,
    salaryTargetNetto,
  } = await getToggleEntries(hourRate, targetHours);

  const untilTarget = targetHours - thisMonthHours;
  const monthStats = `
#### 🗓  Statistics for the ${moment().format("MMMM")}
- ${thisMonthHours.toFixed(1)} hours / Average ${currentAverage.toFixed(
    1
  )} hours per day
`;

  const hoursLeftToday = remainingAverage - todayHours;
  const dayStats = `
#### 📅  Today
- ${todayHours.toFixed(0)} hours /
${hoursLeftToday > 0 ? hoursLeftToday.toFixed(1) : 0} hours left today
`;

  const targetInfo = `
#### 🎯  Target of the month
- ${targetHours} hours / ${
    untilTarget > 0 ? untilTarget.toFixed(0) : 0
  } hours remain
- Average per day: ${targetAverage.toFixed(1)} hours / ${
    remainingAverage > 0 ? remainingAverage.toFixed(1) : 0
  } hours remain
- Salary: ${salaryTargetBrutto.toFixed(0)}€ brutto
/ ${salaryTargetNetto.toFixed(0)}€ netto
`;

  const paycheckInfo = `
### 💶 Paycheck report 
- Earned: ${moneyEarnedBrutto.toFixed(0)}€ brutto
/ ${moneyEarnedNetto.toFixed(0)}€ netto
- Taxes payed: ~${(moneyEarnedBrutto - moneyEarnedNetto).toFixed(1)}€
`;

  return `
${monthStats}  
---
${dayStats}
---
${targetInfo}
---
${paycheckInfo}
`;
};
