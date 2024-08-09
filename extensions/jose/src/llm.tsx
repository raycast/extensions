import { Action, ActionPanel, Icon, List, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { useLlm } from "./hook/useLlm";
import { LlmListView } from "./view/llm/list";
import { LlmHookType } from "./type/llm";
import { ITalkLlm } from "./ai/type";
import { LlmFormLocal } from "./view/llm/formLocal";
import { LlmFormApi } from "./view/llm/formApi";
import { needOnboarding } from "./type/config";
import { Onboarding } from "./view/onboarding/start";
import { useAssistant } from "./hook/useAssistant";
import { OnboardingEmpty } from "./view/onboarding/empty";

export default function Llm() {
  const { push } = useNavigation();
  const collectionsLlm = useLlm();
  const collectionsAssistant = useAssistant();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedLlmId, setSelectedLlmId] = useState<string | null>(null);
  const collectionsSnipppets: LlmHookType = collectionsLlm;

  useEffect(() => {
    if (searchText != "" && searchText.length > 1) {
      collectionsSnipppets.data = collectionsLlm.data.filter((x: ITalkLlm) => x.title.includes(searchText));
    } else {
      collectionsSnipppets.data = collectionsLlm.data;
    }
  }, [searchText]);

  let getActionList = (
    <ActionPanel>
      <Action
        title={"Create Llm"}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        icon={Icon.Plus}
        onAction={() => push(<LlmFormLocal name={searchText} use={{ llms: collectionsSnipppets }} />)}
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
              ? push(<LlmFormLocal llm={llm} use={{ llms: collectionsSnipppets }} />)
              : push(<LlmFormApi llm={llm} use={{ llms: collectionsSnipppets }} />)
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
  let searchBarPlaceholder = "Search Llm...";
  let noAssistant = false;

  if (needOnboarding(collectionsAssistant.data.length) || collectionsAssistant.data.length === 0) {
    getActionList = (
      <ActionPanel>
        <Action
          title="Onboarding"
          icon={Icon.Exclamationmark}
          onAction={() => {
            push(<Onboarding />);
          }}
        />
      </ActionPanel>
    );
    searchBarPlaceholder = "No assistant, first start onboarding to create your first assistant!";
    noAssistant = true;
  }

  return (
    <List
      isShowingDetail={collectionsSnipppets.data.length === 0 ? false : true}
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
      {noAssistant || collectionsSnipppets.data.length === 0 ? (
        noAssistant ? (
          <OnboardingEmpty />
        ) : (
          <List.EmptyView title="No Llms" description="Create new Llm with ⌘ + c shortcut" icon={Icon.Stars} />
        )
      ) : (
        <LlmListView
          key="Llms"
          llms={collectionsSnipppets.data}
          selectedLlm={selectedLlmId}
          actionPanel={getActionItem}
        />
      )}
    </List>
  );
}
