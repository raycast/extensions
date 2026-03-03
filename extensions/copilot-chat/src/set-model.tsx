import {
  Action,
  ActionPanel,
  List,
  Icon,
  Toast,
  showToast,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  useAuth,
  AuthGate,
  fetchModels,
  DEFAULT_MODEL_KEY,
  CopilotModel,
} from "./shared";

export default function SetDefaultModel() {
  const { ghoToken, deviceFlow } = useAuth();
  const [models, setModels] = useState<CopilotModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDefault, setCurrentDefault] = useState<string>("gpt-4.1");

  useEffect(() => {
    LocalStorage.getItem<string>(DEFAULT_MODEL_KEY).then((m) => {
      if (m) setCurrentDefault(m);
    });
  }, []);

  useEffect(() => {
    if (!ghoToken) return;
    fetchModels(ghoToken)
      .then(setModels)
      .catch((e) =>
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch models",
          message: String(e),
        }),
      )
      .finally(() => setIsLoading(false));
  }, [ghoToken]);

  return (
    <AuthGate ghoToken={ghoToken} deviceFlow={deviceFlow}>
      <List isLoading={isLoading} searchBarPlaceholder="Search models...">
        {models.map((model) => (
          <List.Item
            key={model.id}
            title={model.name}
            subtitle={model.id}
            icon={model.id === currentDefault ? Icon.CheckCircle : Icon.Circle}
            accessories={
              model.id === currentDefault
                ? [{ text: "Default", icon: Icon.Star }]
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title="Set as Default Model"
                  icon={Icon.Star}
                  onAction={async () => {
                    await LocalStorage.setItem(DEFAULT_MODEL_KEY, model.id);
                    setCurrentDefault(model.id);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Default model updated",
                      message: model.name,
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    </AuthGate>
  );
}
