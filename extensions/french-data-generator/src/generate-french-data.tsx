import { useEffect, useState } from "react";
import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useSubscribeObservable } from "./helpers/rx.helper";
import { FakeDataStore } from "./stores";
import { EditForm } from "./components/EditForm";
import { calculateAge } from "./utils/date.utils";

export default function Command() {
  const { data: fakeData } = useSubscribeObservable(FakeDataStore.fakeData$);
  const { data: isAddressLoading } = useSubscribeObservable(FakeDataStore.isAddressLoading$);

  const [isEditing, setIsEditing] = useState(false);

  const isMinor = calculateAge(fakeData?.dob || null)! < 18;
  const age = calculateAge(fakeData?.dob || "");

  useEffect(() => {
    if (!fakeData?.dob || !fakeData?.name || !fakeData?.ssn || !fakeData?.bankDetails || !fakeData?.address) {
      FakeDataStore.regenerateData().then(() => {
        showToast({ style: Toast.Style.Success, title: "Données générées avec succès !" });
      });
    }
  }, [fakeData]);

  if (isEditing) {
    return <EditForm initialDob={fakeData?.dob || ""} onClose={() => setIsEditing(false)} />;
  }

  return (
    <List>
      <List.Section title="Informations Générées">
        <List.Item title="Nom et Prénom" subtitle={fakeData?.name?.name || "Nom non défini"} />
        <List.Item title="Numéro de Sécurité Sociale" subtitle={fakeData?.ssn || "SSN non défini"} />
        <List.Item title="IBAN" subtitle={fakeData?.bankDetails?.iban || "IBAN non défini"} />
        <List.Item
          title="Adresse"
          subtitle={isAddressLoading ? "Chargement..." : fakeData?.address || "Adresse non définie"}
        />
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="Modifier la date de naissance"
          subtitle={`Date : ${fakeData?.dob || "Non définie"}${
            isMinor !== null ? ` | ${isMinor ? "Mineur" : "Majeur"} - ${age} ans` : ""
          }`}
          actions={
            <ActionPanel>
              <Action
                title="Modifier"
                onAction={() => {
                  showToast({ style: Toast.Style.Animated, title: "Modification en cours..." });
                  setIsEditing(true);
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Régénérer les données"
          actions={
            <ActionPanel>
              <Action
                title="Régénérer"
                onAction={async () => {
                  try {
                    await FakeDataStore.regenerateData();
                    showToast({ style: Toast.Style.Success, title: "Données régénérées avec succès !" });
                  } catch {
                    showToast({ style: Toast.Style.Failure, title: "Échec de la régénération des données" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
