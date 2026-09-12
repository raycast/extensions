import { ActionPanel, Detail, List, Action, Icon, Color, showToast, popToRoot } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { Distraction, DistractionFormValues } from "./lib/types";
import { feelings } from "./lib/feelings";
import { DistractionForm } from "./components/distraction-form";
import { useMemo } from "react";

export default function Command() {
  const {
    value: unsortedDistractions,
    isLoading,
    setValue: setDistractions,
  } = useLocalStorage<Distraction[]>("distractions", []);

  async function handleDelete(distractionToDelete: Distraction, distractions: Distraction[]) {
    const newDistractions = [...distractions];

    const indexToDelete = distractions.findIndex((distraction) => distractionToDelete.id === distraction.id);
    newDistractions.splice(indexToDelete, 1);

    await setDistractions(newDistractions);

    await showToast({ title: "Deleted Distraction", message: distractionToDelete.title });
  }

  const sortedDistractions = useMemo(() => {
    return unsortedDistractions?.sort((a: Distraction, b: Distraction) => {
      return b.time.valueOf() - a.time.valueOf();
    });
  }, [unsortedDistractions]);

  async function handleEdit({
    distractionId,
    formValues,
    distractions,
  }: {
    distractionId: string;
    formValues: DistractionFormValues;
    distractions: Distraction[];
  }) {
    const newDistractions = [...distractions];

    const indexToEdit = distractions.findIndex((distraction) => distractionId === distraction.id);

    newDistractions[indexToEdit] = {
      ...formValues,
      time: formValues.time ?? new Date(),
      id: distractionId,
      feeling: formValues.feeling as keyof typeof feelings,
    };

    await setDistractions(newDistractions);

    await showToast({ title: "Updated Distraction", message: formValues.title });
  }

  return (
    <List isLoading={isLoading}>
      {sortedDistractions?.map((distraction) => (
        <List.Item
          key={distraction.id}
          title={distraction.title}
          subtitle={distraction.ideas}
          accessories={[
            {
              icon: distraction.internalTrigger ? Icon.BellDisabled : null,
              tooltip: distraction.internalTrigger ? "Internal Trigger" : null,
            },
            {
              icon: distraction.externalTrigger ? Icon.Bell : null,
              tooltip: distraction.externalTrigger ? "External Trigger" : null,
            },
            {
              icon: distraction.planningProblem ? Icon.Pencil : null,
              tooltip: distraction.planningProblem ? "Planning Problem" : null,
            },
            {
              tag: {
                value: `${feelings[distraction.feeling].icon} ${feelings[distraction.feeling].title}`,
                color: Color.Blue,
              },
            },
            { tag: distraction.time },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                target={
                  <Detail
                    navigationTitle={distraction.title}
                    markdown={`
# ${distraction.title}
***
## Ideas
${distraction.ideas}
                `}
                    metadata={
                      <Detail.Metadata>
                        <Detail.Metadata.TagList title="Time">
                          <Detail.Metadata.TagList.Item
                            text={`${distraction.time?.toLocaleString("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                              hour12: false,
                            })}`}
                          />
                        </Detail.Metadata.TagList>
                        <Detail.Metadata.TagList title="Feeling">
                          <Detail.Metadata.TagList.Item
                            text={`${feelings[distraction.feeling].icon} ${feelings[distraction.feeling].title}`}
                            color={Color.Blue}
                          />
                        </Detail.Metadata.TagList>
                        <Detail.Metadata.TagList title="Triggers">
                          {distraction.internalTrigger && (
                            <Detail.Metadata.TagList.Item text="Internal" icon={Icon.BellDisabled} />
                          )}
                          {distraction.externalTrigger && (
                            <Detail.Metadata.TagList.Item text="External" icon={Icon.Bell} />
                          )}
                          {distraction.internalTrigger && (
                            <Detail.Metadata.TagList.Item text="Planning Problem" icon={Icon.Pencil} />
                          )}
                        </Detail.Metadata.TagList>
                      </Detail.Metadata>
                    }
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Edit"
                          target={
                            <DistractionForm
                              onSubmitHandler={async (values) => {
                                await handleEdit({
                                  distractionId: distraction.id,
                                  formValues: values,
                                  distractions: sortedDistractions,
                                });
                                await popToRoot();
                              }}
                              initialValues={distraction}
                            />
                          }
                        />
                        <Action
                          title="Delete Distraction"
                          onAction={() => {
                            handleDelete(distraction, sortedDistractions);
                            popToRoot();
                          }}
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                        />
                      </ActionPanel>
                    }
                  />
                }
              />
              <Action.Push
                title="Edit"
                target={
                  <DistractionForm
                    onSubmitHandler={async (values) => {
                      await handleEdit({
                        distractionId: distraction.id,
                        formValues: values,
                        distractions: sortedDistractions,
                      });
                      await popToRoot();
                    }}
                    initialValues={distraction}
                  />
                }
              />
              <Action
                title="Delete Distraction"
                onAction={async () => {
                  await handleDelete(distraction, sortedDistractions);
                  await popToRoot();
                }}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
