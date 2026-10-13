import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { MissingDependency } from "./components/missing-dependency";
import { RegionField } from "./components/region-field";
import { SsoLoginStatus } from "./components/sso-login-status";
import { resolveRegion, splitRegionForPreset } from "./lib/aws-regions";
import { isGrantedInstalled } from "./lib/dependencies";
import {
  getLastSsoConnection,
  saveLastSsoConnection,
} from "./lib/sso-connection";

const DEFAULT_REGION = "eu-west-1";

export default function Command() {
  const { push } = useNavigation();
  const [startUrl, setStartUrl] = useState("");
  const [regionPreset, setRegionPreset] = useState(DEFAULT_REGION);
  const [regionCustom, setRegionCustom] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const grantedInstalled = useMemo(() => isGrantedInstalled(), []);

  useEffect(() => {
    getLastSsoConnection().then((lastUsed) => {
      if (lastUsed.startUrl) setStartUrl(lastUsed.startUrl);
      if (lastUsed.region) {
        const split = splitRegionForPreset(lastUsed.region);
        setRegionPreset(split.preset);
        setRegionCustom(split.custom);
      }
      setIsLoading(false);
    });
  }, []);

  async function handleSubmit() {
    const startUrlInput = startUrl.trim();
    const regionInput = resolveRegion(
      regionPreset,
      regionCustom,
      DEFAULT_REGION,
    );

    if (!startUrlInput) {
      await showToast({
        style: Toast.Style.Failure,
        title: "SSO start URL is required",
      });
      return;
    }

    await saveLastSsoConnection({
      startUrl: startUrlInput,
      region: regionInput,
    });

    push(<SsoLoginStatus region={regionInput} startUrl={startUrlInput} />);
  }

  if (!grantedInstalled) {
    return <MissingDependency />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log In" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="startUrl"
        title="SSO Start URL"
        placeholder="https://your-company.awsapps.com/start"
        value={startUrl}
        onChange={setStartUrl}
      />
      <RegionField
        preset={regionPreset}
        custom={regionCustom}
        onPresetChange={setRegionPreset}
        onCustomChange={setRegionCustom}
      />
    </Form>
  );
}
