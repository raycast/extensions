import { environment } from "@raycast/api";
import path from "path";

export const claimsPath: string = path.join(environment.assetsPath, "claims.csv");
export const jwtLogo = `file://${environment.assetsPath}/jwt.svg`;
