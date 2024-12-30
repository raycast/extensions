import { MenuBarExtra, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import { useSubscribeObservable } from "./helpers/rx.helper";
import { FakeDataStore } from "./stores";

export default function MenuBarFakeData() {
  const { data: fakeData } = useSubscribeObservable(FakeDataStore.fakeData$);
  const { data: isLoading } = useSubscribeObservable(FakeDataStore.isLoading$);

  const copyToClipboard = async (label: string, content?: string | null) => {
    try {
      await Clipboard.copy(content ?? "Non disponible");
      showToast({ style: Toast.Style.Success, title: `${label} copié !` });
    } catch {
      showToast({ style: Toast.Style.Failure, title: `Échec de la copie de ${label}` });
    }
  };

  const regenerateData = async () => {
    try {
      await FakeDataStore.regenerateData();
      showToast({ style: Toast.Style.Success, title: "Données régénérées !" });
    } catch (error) {
      console.error("[MenuBarFakeData] Erreur lors de la régénération des données :", error);
      showToast({ style: Toast.Style.Failure, title: "Échec de la régénération des données" });
    }
  };

  const { dob, name, ssn, bankDetails, address } = fakeData || {};

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
