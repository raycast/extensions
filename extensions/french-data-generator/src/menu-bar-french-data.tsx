import { MenuBarExtra, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import { useFakeData } from "./hook/useFakeData";

export default function MenuBarFakeData() {
  const { fakeData, isLoading, regenerateData } = useFakeData();

  const copyToClipboard = async (label: string, content?: string | null) => {
    try {
      await Clipboard.copy(content ?? "Non disponible");
      showToast({ style: Toast.Style.Success, title: `${label} copié !` });
    } catch {
      showToast({ style: Toast.Style.Failure, title: `Échec de la copie de ${label}` });
    }
  };

  const { dob, name, ssn, bankDetails, address } = fakeData;

  return (
    <MenuBarExtra icon={Icon.AddPerson} tooltip="Voir les données générées">
      <MenuBarExtra.Section title="Informations de la personne">
        <MenuBarExtra.Item
          title="Nom"
          subtitle={name?.name ?? "Non généré"}
          onAction={() => copyToClipboard("Nom", name?.name)}
        />
        <MenuBarExtra.Item
          title="Date de naissance"
          subtitle={dob ?? "Non générée"}
          onAction={() => copyToClipboard("Date de naissance", dob)}
        />
        <MenuBarExtra.Item
          title="Numéro de Sécurité Sociale"
          subtitle={ssn ?? "Non généré"}
          onAction={() => copyToClipboard("Numéro de Sécurité Sociale", ssn)}
        />
        <MenuBarExtra.Item
          title="IBAN"
          subtitle={bankDetails?.iban ?? "Non généré"}
          onAction={() => copyToClipboard("IBAN", bankDetails?.iban)}
        />
        <MenuBarExtra.Item
          title="Adresse"
          subtitle={isLoading ? "Chargement..." : (address ?? "Non générée")}
          onAction={() => copyToClipboard("Adresse", address)}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Régénérer les données" onAction={regenerateData} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
