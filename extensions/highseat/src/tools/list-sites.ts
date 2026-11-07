import { withAccessToken } from "@raycast/utils"
import { api, highseat } from "../lib/highseat"

export default withAccessToken(highseat)(async () => api.get("/sites"))
