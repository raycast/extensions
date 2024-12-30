import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { FakeDataStore } from "../stores";
import { calculateAge, generateRandomDob } from "../utils/date.utils";

type EditFormProps = {
  initialDob: string;
  onClose: () => void;
};

export function EditForm({ initialDob, onClose }: EditFormProps) {
  const [editedDob, setEditedDob] = useState(initialDob || "");
  const [isMinorChecked, setIsMinorChecked] = useState(false);
  const [isMajorChecked, setIsMajorChecked] = useState(false);

  const age = calculateAge(editedDob);

  const handleCheckboxChange = (type: "minor" | "major") => {
    if (type === "minor") {
      setEditedDob(generateRandomDob(0, 12));
      setIsMinorChecked(true);
      setIsMajorChecked(false);
      showToast({ style: Toast.Style.Animated, title: "Génération d'une date pour un mineur..." });
    } else if (type === "major") {
      setEditedDob(generateRandomDob(18, 99));
      setIsMajorChecked(true);
      setIsMinorChecked(false);
      showToast({ style: Toast.Style.Animated, title: "Génération d'une date pour un majeur..." });
    }
  };

  const handleDobEdit = (value: string) => {
    setEditedDob(value);
    setIsMinorChecked(false);
    setIsMajorChecked(false);
    showToast({ style: Toast.Style.Animated, title: "Modification de la date de naissance..." });
  };

  const handleSaveAndRegenerate = async () => {
    try {
      const updatedDob = editedDob || generateRandomDob(18, 99);
      await FakeDataStore.regenerateData({ dob: updatedDob });
      showToast({ style: Toast.Style.Success, title: "Données sauvegardées et régénérées !" });
      onClose();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Échec de la mise à jour des données" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Valider" onAction={handleSaveAndRegenerate} />
          <Action
            title="Annuler"
            onAction={() => {
              showToast({ style: Toast.Style.Failure, title: "Modification annulée" });
              onClose();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        id="minor"
        label="Générer une personne mineure"
        value={isMinorChecked}
        onChange={() => handleCheckboxChange("minor")}
      />
      <Form.Checkbox
        id="major"
        label="Générer une personne majeure"
        value={isMajorChecked}
        onChange={() => handleCheckboxChange("major")}
      />
      <Form.Description
        title="Date de naissance"
        text={`Date : ${editedDob || "Non définie"}${age !== null ? ` | Âge : ${age} ans` : ""}`}
      />
      <Form.TextField id="dob" placeholder="JJ/MM/AAAA" value={editedDob} onChange={handleDobEdit} />
    </Form>
  );
}
