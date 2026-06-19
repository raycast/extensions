import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { AC_SCENES, sendWizCommand } from "./utils/wiz";
import { useState } from "react";

interface FormValues {
  sceneId: string;
  speed: string;
  brightness: string;
}

export default function Command() {
  const { pop } = useNavigation();
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    AC_SCENES[0].id.toString(),
  );
  const [speedError, setSpeedError] = useState<string | undefined>();
  const [brightnessError, setBrightnessError] = useState<string | undefined>();

  const selectedScene = AC_SCENES.find(
    (s) => s.id.toString() === selectedSceneId,
  );
  const isDynamic = selectedScene?.isDynamic ?? false;

  function validateSpeed(value: string) {
    const val = parseInt(value);
    if (isNaN(val)) return "Must be a number";
    if (val < 10 || val > 200) return "Value must be between 10 and 200";
    return undefined;
  }

  function validateBrightness(value: string) {
    const val = parseInt(value);
    if (isNaN(val)) return "Must be a number";
    if (val < 10 || val > 100) return "Value must be between 10 and 100";
    return undefined;
  }

  async function handleSubmit(values: FormValues) {
    let sError = undefined;
    if (isDynamic) {
      sError = validateSpeed(values.speed);
    }
    const bError = validateBrightness(values.brightness);

    if (sError || bError) {
      if (sError) setSpeedError(sError);
      if (bError) setBrightnessError(bError);
      return;
    }

    try {
      const sceneId = parseInt(values.sceneId);
      const dimming = parseInt(values.brightness);
      const params: Record<string, number> = { sceneId, dimming };

      if (isDynamic) {
        params.speed = parseInt(values.speed);
      }

      await sendWizCommand("setPilot", params);
      await showToast({ style: Toast.Style.Success, title: "Scene Set" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Group scenes by category
  const categories = ["Static", "Dynamic", "Miscellaneous"] as const;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Scene" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="sceneId"
        title="Scene"
        value={selectedSceneId}
        onChange={setSelectedSceneId}
      >
        {categories.map((category) => (
          <Form.Dropdown.Section key={category} title={category}>
            {AC_SCENES.filter((s) => s.category === category).map((scene) => (
              <Form.Dropdown.Item
                key={scene.id}
                value={scene.id.toString()}
                title={scene.name}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>

      {isDynamic && (
        <Form.TextField
          id="speed"
          title="Speed (%)"
          placeholder="10 - 200"
          defaultValue="100"
          error={speedError}
          onChange={() => setSpeedError(undefined)}
          onBlur={(event) =>
            setSpeedError(validateSpeed(event.target.value ?? ""))
          }
        />
      )}

      <Form.TextField
        id="brightness"
        title="Brightness (%)"
        placeholder="10 - 100"
        defaultValue="100"
        error={brightnessError}
        onChange={() => setBrightnessError(undefined)}
        onBlur={(event) =>
          setBrightnessError(validateBrightness(event.target.value ?? ""))
        }
      />
    </Form>
  );
}
