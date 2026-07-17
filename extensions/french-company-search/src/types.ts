export interface Preferences {
  inpiUsername: string;
  inpiPassword: string;
}

// Common address interface to replace 'any' types
export interface AddressInfo {
  adresse: {
    roleAdressePresent?: boolean;
    codePostalPresent?: boolean;
    communePresent?: boolean;
    codeInseeCommunePresent?: boolean;
    complementLocalisation?: string;
    numeroVoie?: string;
    numVoie?: string;
    indiceRepetition?: string;
    typeVoie?: string;
    voie?: string;
    libelleVoie?: string;
    codePostal?: string;
    commune?: string;
    codeInseeCommune?: string;
    pays?: string;
    codePays?: string;
  };
  caracteristiques?: {
    domiciliataire?: boolean;
    ambulant?: boolean;
  };
}

// Representative information interface
export interface RepresentativeInfo {
  name: string;
  role: string;
  gender: string | null;
  // For cascade representation when representative is a holding company
  isHolding?: boolean;
  corporateSiren?: string | null; // SIREN of the holding company for recursive search
  holdingRepresentative?: {
    name: string;
    role: string;
    gender: string | null;
  };
}

// Person description interface for better type safety
export interface PersonDescription {
  role?: string;
  nom?: string;
  prenoms?: string[];
  genre?: string;
  sexe?: string;
  civilite?: string;
  nationalite?: string;
  dateDeNaissance?: string;
  lieuDeNaissance?: string;
}

export interface ApiLoginResponse {
  token: string;
}

export interface CompanyData {
  updatedAt: string;
  nombreRepresentantsActifs: number;
  nombreEtablissementsOuverts: number;
  id: string;
  formality: {
    siren: string;
    content: {
      succursaleOuFiliale: string;
      formeExerciceActivitePrincipale: string;
      natureCreation: {
        dateCreation: string;
        societeEtrangere: boolean;
        formeJuridique: string;
        formeJuridiqueInsee: string;
        etablieEnFrance: boolean;
        salarieEnFrance: boolean;
        relieeEntrepriseAgricole: boolean;
        entrepriseAgricole: boolean;
      };
      personneMorale?: {
        denomination?: string;
        formeJuridique?: string;
        capital?: {
          montant: number;
        };
        immatriculationRcs?: {
          villeImmatriculation: string;
          numeroRcs: string;
        };
        adresseEntreprise: AddressInfo;
        identite?: {
          entreprise?: {
            denomination?: string;
          };
          description?: {
            montantCapital?: number;
          };
        };
        composition?: {
          pouvoirs?: Array<{
            individu?: {
              descriptionPersonne?: PersonDescription;
            };
            entreprise?: {
              denomination?: string;
              siren?: string;
            };
            roleEntreprise?: string;
          }>;
        };
      };
      personnePhysique?: {
        identite?: {
          entrepreneur?: {
            descriptionPersonne: PersonDescription;
          };
        };
        adresseEntreprise: AddressInfo;
        adressePersonne?: AddressInfo;
      };
    };
  };
}
