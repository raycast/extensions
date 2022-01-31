import { LoginForm, TroubleshootingGuide, UnlockForm } from "./components";
import { Bitwarden } from "./api";
import { useBitwarden } from "./hooks";

export default function CreateRecord() {
  try {
    const bitwardenApi = new Bitwarden();
    const [state, setSessionToken] = useBitwarden(bitwardenApi);

    if (state.vaultStatus === "locked") {
      return <UnlockForm setSessionToken={setSessionToken} bitwardenApi={bitwardenApi} />;
    }
    return <LoginForm bitwardenApi={bitwardenApi} sessionToken={state.sessionToken}/>;
  } catch (error) {
    return <TroubleshootingGuide />;
  }
}