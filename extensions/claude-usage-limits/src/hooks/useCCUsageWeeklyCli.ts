import { useCCUsageReport } from "./useCCUsageReport";
import { getSummaryReport } from "../utils/usage-report";

export const useCCUsageWeeklyCli = () => useCCUsageReport("summary", getSummaryReport);
