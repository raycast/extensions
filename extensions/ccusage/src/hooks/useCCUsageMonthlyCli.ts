import { useCCUsageReport } from "./useCCUsageReport";
import { getSummaryReport } from "../utils/usage-report";

export const useCCUsageMonthlyCli = () => useCCUsageReport("summary", getSummaryReport);
