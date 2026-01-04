import { ModelView } from "./lib/ui/ModelView/main";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command() {
  return ModelView();
}
