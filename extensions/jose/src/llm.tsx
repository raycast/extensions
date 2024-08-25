import { Action, ActionPanel, Icon, List, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { useLlm } from "./hook/useLlm";
import { LlmListView } from "./view/llm/list";
import { LlmHookType } from "./type/llm";
import { ITalkLlm } from "./ai/type";
import { LlmFormLocal } from "./view/llm/formLocal";
import { LlmFormApi } from "./view/llm/formApi";
import { needOnboarding } from "./type/config";
import Onboarding from "./onboarding";
import { useAssistant } from "./hook/useAssistant";
import { useOnboarding } from "./hook/useOnboarding";

export default function Llm() {
  const { push } = useNavigation();
  const collectionsLlm = useLlm();
  const collectionsAssistant = useAssistant();
  const hookOnboarding = useOnboarding();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedLlmId, setSelectedLlmId] = useState<string | null>(null);
  const collectionsLlms: LlmHookType = collectionsLlm;

  useEffect(() => {
    if (searchText != "" && searchText.length > 1) {
      collectionsLlms.data = collectionsLlm.data.filter((x: ITalkLlm) => x.title.includes(searchText));
    } else {
      collectionsLlms.data = collectionsLlm.data;
    }
  }, [searchText]);

  if (
    !hookOnboarding.data &&
    (needOnboarding(collectionsAssistant.data.length) || collectionsAssistant.data.length === 0)
  ) {
    return <Onboarding />;
  }

  const getActionList = (
    <ActionPanel>
      <Action
        title={"Create Llm"}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        icon={Icon.Plus}
        onAction={() => push(<LlmFormLocal name={searchText} use={{ llms: collectionsLlms }} />)}
      />
      <Action title={"Reload Llms From Api"} icon={Icon.Download} onAction={() => collectionsLlm.reload()} />
    </ActionPanel>
  );
  const getActionItem = (llm: ITalkLlm) => (
    <ActionPanel>
      <ActionPanel.Section title="Modify">
        <Action
          title={"Edit Llm"}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          icon={Icon.Pencil}
          onAction={() =>
            llm.isLocal
              ? push(<LlmFormLocal llm={llm} use={{ llms: collectionsLlms }} />)
              : push(<LlmFormApi llm={llm} use={{ llms: collectionsLlms }} />)
          }
        />
        <Action
          style={Action.Style.Destructive}
          icon={Icon.RotateAntiClockwise}
          title="Remove"
          onAction={async () => {
            await confirmAlert({
              title: "Are you sure you want to remove this Llm from your collection?",
              message: "This action cannot be undone",
              icon: Icon.RotateAntiClockwise,
              primaryAction: {
                title: "Remove",
                style: Alert.ActionStyle.Destructive,
                onAction: () => {
                  collectionsLlm.remove(llm);
                },
              },
            });
          }}
        />
      </ActionPanel.Section>
      <Action
        title={"Create Llm"}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        icon={Icon.Plus}
        onAction={() => push(<LlmFormLocal name={searchText} use={{ llms: collectionsLlm }} />)}
      />
      <Action title={"Reload Llms From Api"} icon={Icon.Download} onAction={() => collectionsLlm.reload()} />
    </ActionPanel>
  );
  const searchBarPlaceholder = "Search Llm...";

  return (
    <List
      isShowingDetail={collectionsLlms.data.length === 0 ? false : true}
      isLoading={collectionsLlm.isLoading}
      filtering={false}
      throttle={false}
      selectedItemId={selectedLlmId || undefined}
      onSelectionChange={(id) => setSelectedLlmId(id)}
      searchBarPlaceholder={searchBarPlaceholder}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      actions={getActionList}
    >
      <LlmListView key="Llms" llms={collectionsLlms.data} selectedLlm={selectedLlmId} actionPanel={getActionItem} />
    </List>
  );
}
