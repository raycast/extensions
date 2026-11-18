import { useCCUsageReport } from "./useCCUsageReport";
import { getSessionReport } from "../utils/usage-report";

export const useCCUsageSessionCli = () => useCCUsageReport("sessions", getSessionReport);
