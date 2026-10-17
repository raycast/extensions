import {
  Action,
  ActionPanel,
  Form,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getProvider, getSelectedModel, saveSelectedModel } from "./lib/config";
import { discoverModels, Model } from "./lib/models";
export default function ModelPicker() {
  const [models, setModels] = useState<Model[]>([]);
  const [selected, setSelected] = useState("");
  const [manual, setManual] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("Fetching available models…");
  const { pop } = useNavigation();
  async function refresh() {
    setBusy(true);
    try {
      const provider = getProvider();
      const result = await discoverModels(provider.baseUrl, provider.apiKey);
      setModels(result);
      setMessage(
        result.length
          ? `${result.length} models found. Image candidates are shown first. Listing a model does not verify Images API compatibility.`
          : "No models returned. Enter a model ID manually.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Model discovery failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    getSelectedModel()
      .then((value) => {
        if (active && value) {
          setManual(value);
        }
      })
      .catch(() => {});
    void refresh();
    return () => {
      active = false;
    };
  }, []);
  const visible = models.filter((m) => showAll || m.source !== "unknown");
  return (
    <Form
      navigationTitle="Choose Default Model"
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Default Model"
            icon={Icon.Checkmark}
            onSubmit={async () => {
              const model = selected === "" ? manual.trim() : selected;
              if (!model) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Select a model or enter its ID",
                });
                return;
              }
              try {
                await saveSelectedModel(model);
                await showToast({
                  title: "Default model saved",
                  message: model,
                });
                pop();
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not save model",
                });
              }
            }}
          />
          <Action
            title="Refresh Models"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
          />
          <Action
            title="Edit API and Save Location"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Provider" text={getProvider().baseUrl} />
      <Form.Description text={message} />
      <Form.Checkbox
        id="all"
        label="Show all models"
        value={showAll}
        onChange={(value) => {
          setShowAll(value);
          setSelected("");
        }}
      />
      <Form.Dropdown
        id="model"
        title="Default Model"
        value={selected}
        onChange={setSelected}
      >
        <Form.Dropdown.Item value="" title="Use Saved / Manual Model ID" />
        {visible.map((model) => (
          <Form.Dropdown.Item
            key={model.id}
            value={model.id}
            title={`${model.id}${model.source === "declared" ? " · Image output" : model.source === "inferred" ? " · Suggested" : ""}`}
          />
        ))}
      </Form.Dropdown>
      {selected === "" && (
        <Form.TextField
          id="manual"
          title="Model ID"
          placeholder="Enter your provider's exact model ID"
          value={manual}
          onChange={setManual}
        />
      )}
      <Form.Description
        title="Save Images To"
        text={getProvider().outputDirectory}
      />
      <Form.Description text="Change API credentials and the save folder using Edit API and Save Location in the action menu. Reopen this page after changing providers. Discovery does not generate or charge for a test image." />
    </Form>
  );
}
