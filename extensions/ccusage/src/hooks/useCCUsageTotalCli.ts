import { useCCUsageReport } from "./useCCUsageReport";
import { getSummaryReport } from "../utils/usage-report";

export const useCCUsageTotalCli = () => useCCUsageReport("summary", getSummaryReport);
