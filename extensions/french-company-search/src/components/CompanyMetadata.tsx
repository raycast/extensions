import { Detail } from "@raycast/api";
import { CompanyData } from "../types";
import { formatAddress, formatField, formatSiren, getLegalFormLabel } from "../lib/utils";
import { findGreffeByCodePostal } from "../lib/greffe-lookup";

interface CompanyMetadataProps {
  data: CompanyData;
}

export function CompanyMetadata({ data }: CompanyMetadataProps) {
  const content = data.formality.content;
  const personneMorale = content.personneMorale;
  const personnePhysique = content.personnePhysique;
  const natureCreation = content.natureCreation;

  let denomination = "[[à compléter]]";
  let shareCapital = "[[à compléter]]";
  let rcsCity = "[[à compléter]]";
  let address = "[[à compléter]]";
  let codePostal: string | undefined;

  if (personneMorale) {
    const identite = personneMorale.identite;
    denomination = formatField(identite?.entreprise?.denomination);
    shareCapital = formatField(identite?.description?.montantCapital);
    address = formatAddress(personneMorale.adresseEntreprise);
    codePostal = personneMorale.adresseEntreprise?.adresse?.codePostal;
  } else if (personnePhysique) {
    const desc = personnePhysique.identite?.entrepreneur?.descriptionPersonne;
    const prenoms = desc?.prenoms?.join(" ") || "";
    denomination = `${prenoms} ${desc?.nom || ""}`.trim();
    shareCapital = "N/A";
    address = formatAddress(personnePhysique.adresseEntreprise);
    codePostal = personnePhysique.adresseEntreprise?.adresse?.codePostal;
  }

  const greffeFromData = codePostal ? findGreffeByCodePostal(codePostal) : null;
  rcsCity = formatField(greffeFromData || personneMorale?.immatriculationRcs?.villeImmatriculation);

  const sirenFormatted = formatSiren(data.formality.siren);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="SIREN" text={data.formality.siren} />
      <Detail.Metadata.Label title="Dénomination" text={denomination} />
      <Detail.Metadata.Label title="Forme juridique" text={getLegalFormLabel(natureCreation.formeJuridique)} />
      <Detail.Metadata.Label title="Date création" text={formatField(natureCreation.dateCreation)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Capital social"
        text={shareCapital !== "[[à compléter]]" && shareCapital !== "N/A" ? `${shareCapital}\u00A0€` : shareCapital}
      />
      <Detail.Metadata.Label
        title="RCS"
        text={rcsCity !== "[[à compléter]]" ? `${rcsCity} - ${sirenFormatted}` : `[[à compléter]] - ${sirenFormatted}`}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Adresse" text={address} />
      <Detail.Metadata.Label title="Établie en France" text={natureCreation.etablieEnFrance ? "Oui" : "Non"} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Dernière MAJ INPI" text={data.updatedAt} />
      <Detail.Metadata.Label title="Établissements ouverts" text={data.nombreEtablissementsOuverts.toString()} />
    </Detail.Metadata>
  );
}
