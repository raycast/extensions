import { withAccessToken } from "@raycast/utils";

import { CreateCardForm } from "./components/create-card-form";
import { ensureAccount } from "./lib/hackban";

export default withAccessToken({ authorize: ensureAccount })(function CreateCard() {
  return <CreateCardForm />;
});
