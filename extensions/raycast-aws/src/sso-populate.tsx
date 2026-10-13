import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { MissingDependency } from "./components/missing-dependency";
import { RegionField } from "./components/region-field";
import { SsoPopulateStatus } from "./components/sso-populate-status";
import { resolveRegion, splitRegionForPreset } from "./lib/aws-regions";
import { isGrantedInstalled } from "./lib/dependencies";
import {
  getLastSsoConnection,
  saveLastSsoConnection,
} from "./lib/sso-connection";

const DEFAULT_REGION = "eu-west-1";
const CUSTOM_TEMPLATE_VALUE = "__custom__";
const PRESET_TEMPLATES = [
  {
    value: "{{ .AccountName }}/{{ .RoleName }}",
    title: "AccountName/RoleName (Default)",
  },
  {
    value: "{{ .AccountName }}.{{ .AccountID }}/{{ .RoleName }}",
    title: "AccountName.AccountID/RoleName (Recommended)",
  },
  {
    value: "{{ .AccountName }}.{{ .RoleName }}",
    title: "AccountName.RoleName",
  },
  {
    value: "{{ .AccountID }}.{{ .AccountName }}/{{ .RoleName }}",
    title: "AccountID.AccountName/RoleName",
  },
  {
    value: "{{ .AccountName }}/{{ .RoleName }}.{{ .AccountID }}",
    title: "AccountName/RoleName.AccountID",
  },
];

const PREFS_STORAGE_KEY = "sso-populate-last-used";

interface PopulatePrefs {
  profileTemplatePreset: string;
  customProfileTemplate: string;
  trimAccountNamePrefix: string;
  prefix: string;
  prune: boolean;
  useCredentialProcess: boolean;
  useDeviceCode: boolean;
  ssoBrowserProfile: string;
}

function escapeGoStringLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Granted's --profile-template has no dedicated "trim prefix" flag; trimPrefix is a template
// function, so we weave it into whichever preset is chosen rather than requiring users to
// hand-write the Go template themselves.
function applyTrimPrefix(template: string, trimPrefix: string): string {
  if (!trimPrefix) return template;
  const replacement = `trimPrefix "${escapeGoStringLiteral(trimPrefix)}" .AccountName`;
  return template.split(".AccountName").join(replacement);
}

export default function Command() {
  const { push } = useNavigation();
  const [startUrl, setStartUrl] = useState("");
  const [regionPreset, setRegionPreset] = useState(DEFAULT_REGION);
  const [regionCustom, setRegionCustom] = useState("");
  const [profileTemplatePreset, setProfileTemplatePreset] = useState(
    PRESET_TEMPLATES[0].value,
  );
  const [customProfileTemplate, setCustomProfileTemplate] = useState("");
  const [trimAccountNamePrefix, setTrimAccountNamePrefix] = useState("");
  const [prefix, setPrefix] = useState("");
  const [prune, setPrune] = useState(true);
  const [useCredentialProcess, setUseCredentialProcess] = useState(true);
  const [useDeviceCode, setUseDeviceCode] = useState(false);
  const [ssoBrowserProfile, setSsoBrowserProfile] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const grantedInstalled = useMemo(() => isGrantedInstalled(), []);

  useEffect(() => {
    Promise.all([
      getLastSsoConnection(),
      LocalStorage.getItem<string>(PREFS_STORAGE_KEY),
    ]).then(([connection, storedPrefs]) => {
      if (connection.startUrl) setStartUrl(connection.startUrl);
      if (connection.region) {
        const split = splitRegionForPreset(connection.region);
        setRegionPreset(split.preset);
        setRegionCustom(split.custom);
      }

      if (storedPrefs) {
        try {
          const prefs = JSON.parse(storedPrefs) as Partial<PopulatePrefs>;
          if (prefs.profileTemplatePreset !== undefined) {
            setProfileTemplatePreset(prefs.profileTemplatePreset);
          }
          if (prefs.customProfileTemplate !== undefined) {
            setCustomProfileTemplate(prefs.customProfileTemplate);
          }
          if (prefs.trimAccountNamePrefix !== undefined) {
            setTrimAccountNamePrefix(prefs.trimAccountNamePrefix);
          }
          if (prefs.prefix !== undefined) setPrefix(prefs.prefix);
          if (prefs.prune !== undefined) setPrune(prefs.prune);
          if (prefs.useCredentialProcess !== undefined) {
            setUseCredentialProcess(prefs.useCredentialProcess);
          }
          if (prefs.useDeviceCode !== undefined) {
            setUseDeviceCode(prefs.useDeviceCode);
          }
          if (prefs.ssoBrowserProfile !== undefined) {
            setSsoBrowserProfile(prefs.ssoBrowserProfile);
          }
        } catch {
          // ignore corrupt stored value and fall back to defaults
        }
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
    const isCustomTemplate = profileTemplatePreset === CUSTOM_TEMPLATE_VALUE;
    const resolvedTemplate = isCustomTemplate
      ? customProfileTemplate.trim()
      : applyTrimPrefix(profileTemplatePreset, trimAccountNamePrefix.trim());

    if (!startUrlInput) {
      await showToast({
        style: Toast.Style.Failure,
        title: "SSO start URL is required",
      });
      return;
    }

    if (isCustomTemplate && !resolvedTemplate) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Custom profile template is required",
      });
      return;
    }

    await saveLastSsoConnection({
      startUrl: startUrlInput,
      region: regionInput,
    });
    await LocalStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({
        profileTemplatePreset,
        customProfileTemplate,
        trimAccountNamePrefix,
        prefix,
        prune,
        useCredentialProcess,
        useDeviceCode,
        ssoBrowserProfile,
      } satisfies PopulatePrefs),
    );

    push(
      <SsoPopulateStatus
        ssoRegion={regionInput}
        ssoStartUrl={startUrlInput}
        profileTemplate={resolvedTemplate || undefined}
        prefix={prefix.trim() || undefined}
        prune={prune}
        noCredentialProcess={!useCredentialProcess}
        useDeviceCode={useDeviceCode}
        ssoBrowserProfile={ssoBrowserProfile.trim() || undefined}
      />,
    );
  }

  if (!grantedInstalled) {
    return <MissingDependency />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Populate Profiles"
            onSubmit={handleSubmit}
          />
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
      <Form.Dropdown
        id="profileTemplatePreset"
        title="Profile Name Template"
        info="Pick a preset, or choose Custom to enter your own Granted --profile-template"
        value={profileTemplatePreset}
        onChange={setProfileTemplatePreset}
      >
        {PRESET_TEMPLATES.map((preset) => (
          <Form.Dropdown.Item
            key={preset.value}
            value={preset.value}
            title={preset.title}
          />
        ))}
        <Form.Dropdown.Item value={CUSTOM_TEMPLATE_VALUE} title="Custom..." />
      </Form.Dropdown>
      {profileTemplatePreset === CUSTOM_TEMPLATE_VALUE ? (
        <Form.TextField
          id="customProfileTemplate"
          title="Custom Profile Template"
          placeholder='{{ trimPrefix "NC---" .AccountName }}.{{ .AccountID }}/{{ .RoleName }}'
          value={customProfileTemplate}
          onChange={setCustomProfileTemplate}
        />
      ) : (
        <Form.TextField
          id="trimAccountNamePrefix"
          title="Trim Prefix from Account Name (optional)"
          placeholder="e.g. NC--- (applies Go's trimPrefix to .AccountName)"
          value={trimAccountNamePrefix}
          onChange={setTrimAccountNamePrefix}
        />
      )}
      <Form.TextField
        id="prefix"
        title="Profile Prefix (optional)"
        placeholder="e.g. test_"
        value={prefix}
        onChange={setPrefix}
      />
      <Form.TextField
        id="ssoBrowserProfile"
        title="Browser Profile (optional)"
        placeholder="Use a pre-existing browser profile for SSO login"
        value={ssoBrowserProfile}
        onChange={setSsoBrowserProfile}
      />
      <Form.Checkbox
        id="prune"
        label="Remove stale generated profiles (--prune)"
        value={prune}
        onChange={setPrune}
      />
      <Form.Checkbox
        id="useCredentialProcess"
        label="Use Granted credential-process integration"
        value={useCredentialProcess}
        onChange={setUseCredentialProcess}
      />
      <Form.Checkbox
        id="useDeviceCode"
        label="Force device-code flow (--use-device-code)"
        value={useDeviceCode}
        onChange={setUseDeviceCode}
      />
    </Form>
  );
}
