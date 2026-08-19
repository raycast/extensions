import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deskOptionTitle,
  DiscoveredDesk,
  mergeDiscoveredDesk,
  rememberedSelectionForRescan,
} from "./desk-discovery";
import { restoreDefaultDeskSession, saveDeskSession } from "./desk-session";
import { parseHeight, validateConfiguration, validateTarget } from "./model";
import { discoverDesks } from "./native";
import {
  DeskSettings,
  getCachedDeskStatus,
  getDeskIdentifier,
} from "./storage";

const NO_DESK = "no-desk";

type SettingsValues = {
  deskName: string;
  baseHeight: string;
  minimumHeight: string;
  maximumHeight: string;
  stepHeight: string;
  sitHeight: string;
  standHeight: string;
};

function formValues(settings: DeskSettings): SettingsValues {
  return {
    deskName: settings.configuration.deskName,
    baseHeight: String(settings.configuration.baseHeight),
    minimumHeight: String(settings.configuration.minimumHeight),
    maximumHeight: String(settings.configuration.maximumHeight),
    stepHeight: String(settings.configuration.stepHeight),
    sitHeight: String(settings.presets.sit),
    standHeight: String(settings.presets.stand),
  };
}

export default function SettingsForm({
  initialSettings,
  onSaved,
  popAfterSave = true,
}: {
  initialSettings: DeskSettings;
  onSaved: (settings: DeskSettings, hasSelectedDesk: boolean) => void;
  popAfterSave?: boolean;
}) {
  const { pop } = useNavigation();
  const [values, setValues] = useState(() => formValues(initialSettings));
  const [desks, setDesks] = useState<DiscoveredDesk[]>([]);
  const [rememberedIdentifier, setRememberedIdentifier] = useState<string>();
  const [selectedIdentifier, setSelectedIdentifier] = useState(NO_DESK);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string>();
  const [error, setError] = useState<string>();
  const scanActive = useRef(false);

  const addDesk = useCallback((desk: DiscoveredDesk) => {
    setDesks((current) => mergeDiscoveredDesk(current, desk));
  }, []);

  const scanForDesks = useCallback(
    async (nameFilter: string, preservedIdentifier?: string) => {
      if (scanActive.current) return;
      scanActive.current = true;
      setDesks((current) =>
        current.filter((desk) => desk.identifier === preservedIdentifier),
      );
      setSelectedIdentifier(
        (current) =>
          rememberedSelectionForRescan(current, preservedIdentifier) ?? NO_DESK,
      );
      setIsDiscovering(true);
      setDiscoveryError(undefined);
      try {
        await discoverDesks(nameFilter, addDesk);
      } catch (scanError) {
        setDiscoveryError(
          scanError instanceof Error ? scanError.message : String(scanError),
        );
      } finally {
        scanActive.current = false;
        setIsDiscovering(false);
      }
    },
    [addDesk],
  );

  useEffect(() => {
    let active = true;
    void Promise.all([getDeskIdentifier(), getCachedDeskStatus()]).then(
      ([identifier, cachedStatus]) => {
        if (!active) return;
        if (identifier) {
          setRememberedIdentifier(identifier);
          setSelectedIdentifier(identifier);
          addDesk({
            identifier,
            name:
              cachedStatus?.deskName ?? initialSettings.configuration.deskName,
            nameQuality: cachedStatus?.deskName ? 1 : 0,
            connected: false,
          });
        }
        void scanForDesks(initialSettings.configuration.deskName, identifier);
      },
    );
    return () => {
      active = false;
    };
  }, [addDesk, initialSettings.configuration.deskName, scanForDesks]);

  function update(name: keyof SettingsValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setError(undefined);
  }

  function parseSettings(): DeskSettings {
    const configuration = validateConfiguration({
      deskName: values.deskName,
      baseHeight: parseHeight(values.baseHeight, "Base Height"),
      minimumHeight: parseHeight(values.minimumHeight, "Minimum Height"),
      maximumHeight: parseHeight(values.maximumHeight, "Maximum Height"),
      stepHeight: parseHeight(values.stepHeight, "Raise and Lower Step"),
    });
    return {
      configuration,
      presets: {
        sit: validateTarget(
          parseHeight(values.sitHeight, "Sit Height"),
          configuration,
        ),
        stand: validateTarget(
          parseHeight(values.standHeight, "Stand Height"),
          configuration,
        ),
      },
    };
  }

  async function submit() {
    try {
      if (selectedIdentifier === NO_DESK) {
        throw new Error(
          "Select a nearby desk. Put the desk in Bluetooth pairing mode, then scan again.",
        );
      }
      const selectedDesk = desks.find(
        (desk) => desk.identifier === selectedIdentifier,
      );
      if (!selectedDesk) {
        throw new Error(
          "The selected desk is no longer available. Scan again.",
        );
      }
      const settings = parseSettings();
      await saveDeskSession(settings, selectedIdentifier);
      setRememberedIdentifier(selectedIdentifier);
      onSaved(settings, true);
      if (popAfterSave) pop();
      await showToast({
        style: Toast.Style.Success,
        title: "Saved desk settings",
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : String(submissionError),
      );
    }
  }

  async function restore() {
    const confirmed = await confirmAlert({
      title: "Restore default settings?",
      message:
        "This resets desk limits, adjustment step, and Sit and Stand positions. You must select the desk and review the safety notice again.",
      primaryAction: {
        title: "Restore Defaults",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });
    if (!confirmed) return;

    try {
      const settings = await restoreDefaultDeskSession();
      setRememberedIdentifier(undefined);
      setSelectedIdentifier(NO_DESK);
      setDesks([]);
      setValues(formValues(settings));
      setError(undefined);
      onSaved(settings, false);
      await showToast({
        style: Toast.Style.Success,
        title: "Restored default settings",
        message: "Sit 70 cm · Stand 110 cm · Range 62–127 cm",
      });
    } catch (restoreError) {
      const message =
        restoreError instanceof Error
          ? restoreError.message
          : String(restoreError);
      setError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not restore settings",
        message,
      });
    }
  }

  return (
    <Form
      navigationTitle={popAfterSave ? "Desk Settings" : undefined}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Settings"
            icon={Icon.Checkmark}
            onSubmit={submit}
          />
          <Action
            title={isDiscovering ? "Scanning for Desks" : "Scan for Desks"}
            icon={Icon.Wifi}
            onAction={() => scanForDesks(values.deskName, rememberedIdentifier)}
          />
          <Action
            title="Restore Default Settings"
            icon={Icon.ArrowCounterClockwise}
            style={Action.Style.Destructive}
            onAction={restore}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="deskIdentifier"
        title="Desk"
        value={selectedIdentifier}
        onChange={setSelectedIdentifier}
      >
        <Form.Dropdown.Item
          value={NO_DESK}
          title={
            isDiscovering
              ? "Scanning for desks…"
              : desks.length === 0
                ? "No desks found"
                : "Select a desk…"
          }
        />
        {desks.map((desk) => (
          <Form.Dropdown.Item
            key={desk.identifier}
            value={desk.identifier}
            title={deskOptionTitle(desk, rememberedIdentifier)}
          />
        ))}
      </Form.Dropdown>
      <Form.Description
        title={discoveryError ? "Discovery Failed" : "Bluetooth Discovery"}
        text={
          discoveryError ??
          (isDiscovering
            ? "Scanning nearby Bluetooth devices. This does not move the desk."
            : "Put the desk in Bluetooth pairing mode, then use Scan for Desks to refresh this list.")
        }
      />
      <Form.TextField
        id="deskName"
        title="Discovery Name Filter"
        placeholder="Desk"
        value={values.deskName}
        onChange={(value) => update("deskName", value)}
      />
      <Form.Separator />
      <Form.TextField
        id="baseHeight"
        title="Base Height"
        placeholder="62"
        value={values.baseHeight}
        onChange={(value) => update("baseHeight", value)}
      />
      <Form.TextField
        id="minimumHeight"
        title="Minimum Height"
        placeholder="62"
        value={values.minimumHeight}
        onChange={(value) => update("minimumHeight", value)}
      />
      <Form.TextField
        id="maximumHeight"
        title="Maximum Height"
        placeholder="127"
        value={values.maximumHeight}
        onChange={(value) => update("maximumHeight", value)}
      />
      <Form.TextField
        id="stepHeight"
        title="Raise and Lower Step"
        placeholder="1"
        value={values.stepHeight}
        onChange={(value) => update("stepHeight", value)}
      />
      <Form.Separator />
      <Form.TextField
        id="sitHeight"
        title="Sit Height"
        placeholder="70"
        value={values.sitHeight}
        onChange={(value) => update("sitHeight", value)}
      />
      <Form.TextField
        id="standHeight"
        title="Stand Height"
        placeholder="110"
        value={values.standHeight}
        onChange={(value) => update("standHeight", value)}
      />
      <Form.Description
        title={error ? "Cannot Save" : "Defaults"}
        text={
          error ??
          "Desk · base 62 cm · range 62–127 cm · step 1 cm · Sit 70 cm · Stand 110 cm"
        }
      />
    </Form>
  );
}
