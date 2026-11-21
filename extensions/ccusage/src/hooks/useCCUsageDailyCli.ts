import { useCCUsageReport } from "./useCCUsageReport";
import { getSummaryReport } from "../utils/usage-report";

export const useCCUsageDailyCli = () => useCCUsageReport("summary", getSummaryReport);
