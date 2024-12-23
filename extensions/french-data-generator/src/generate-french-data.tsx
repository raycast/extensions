import { useState } from "react";
import { List, ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useFakeData } from "./hook/useFakeData";
import { generateRandomSSN, getRandomName } from "./Utils/random";

export default function Command() {
  const { fakeData, setFakeData, saveData, isLoading, revalidate } = useFakeData();
  const [isEditing, setIsEditing] = useState(false);
  const { dob, name, ssn, bankDetails, address } = fakeData;
  const [isMinor, setIsMinor] = useState<boolean>(
    dob ? new Date().getFullYear() - parseInt(dob.split("/")[2], 10) < 18 : false,
  );

  const handleSaveAndRegenerate = async (newDob: string | null, minorStatus: boolean) => {
    try {
      // Use the existing date or a new one if provided
      const updatedDob = newDob || dob || (isMinor ? "01/01/2010" : "01/01/1980");
      const updatedName = getRandomName();
      const updatedSSN = generateRandomSSN(updatedDob, updatedName.gender, minorStatus ?? isMinor);

      // Update data with date, name, and SSN
      const updatedFakeData = {
        ...fakeData,
        dob: updatedDob,
        name: updatedName,
        ssn: updatedSSN,
        address: "Non générée", // Reset the address to trigger a new fetch
      };

      setFakeData(updatedFakeData);
      await saveData(updatedFakeData); // Save in local storage
      await revalidate(); // Fetch a new address
      showToast({ style: Toast.Style.Success, title: "Données sauvegardées et régénérées !" });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Échec de la mise à jour des données" });
    }
  };

  if (isEditing) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action
              title="Valider"
              onAction={async () => {
                await handleSaveAndRegenerate(fakeData.dob, isMinor); // Use updated values
                setIsEditing(false); // Exit edit mode
              }}
            />
            <Action title="Annuler" onAction={() => setIsEditing(false)} />
          </ActionPanel>
        }
      >
        <Form.Checkbox
          id="isMinor"
          label="Générer une personne mineure"
          value={isMinor}
          onChange={(newValue) => {
            setIsMinor(newValue);
            const updatedDob = newValue ? "01/01/2010" : "01/01/1980";
            setFakeData({ ...fakeData, dob: updatedDob });
          }}
        />
        <Form.TextField
          id="dob"
          title="Date de naissance"
          placeholder="JJ/MM/AAAA"
          value={dob || ""}
          onChange={(newDob) => setFakeData({ ...fakeData, dob: newDob })}
        />
      </Form>
    );
  }

  return (
    <List>
      <List.Section title="Informations Générées">
        <List.Item
          title="Nom et Prénom"
          subtitle={name?.name || "Nom non défini"}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={name?.name || ""} title="Copier Nom / Prénom" />
            </ActionPanel>
          }
        />
        <List.Item
          title="Numéro de Sécurité Sociale"
          subtitle={ssn || "SSN non défini"}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={ssn || ""} title="Copier Ssn" />
            </ActionPanel>
          }
        />
        <List.Item
          title="IBAN"
          subtitle={bankDetails?.iban || "IBAN non défini"}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={bankDetails?.iban || ""} title="Copier Iban" />
            </ActionPanel>
          }
        />
        <List.Item
          title="Adresse"
          subtitle={isLoading ? "Chargement..." : address || "Adresse non définie"}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={address || ""} title="Copier Adresse" />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="Modifier la date de naissance"
          subtitle={`Date : ${dob || "Non définie"} | ${isMinor ? "Mineur" : "Majeur"}`}
          actions={
            <ActionPanel>
              <Action title="Modifier" onAction={() => setIsEditing(true)} />
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
                    await handleSaveAndRegenerate(dob, isMinor); // Re-use existing date and minor status
                    showToast({ style: Toast.Style.Success, title: "Données régénérées !" });
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
