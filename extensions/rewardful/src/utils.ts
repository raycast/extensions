import moment from "moment";

export const baseUrl = "https://api.getrewardful.com/v1";
export const siteUrl = "https://app.getrewardful.com";

const userLocale = Intl.DateTimeFormat().resolvedOptions().locale;
const simplifiedLocale = userLocale.split("-u")[0];

export const currentLocale = moment.locale(simplifiedLocale);
