export interface EBirdSimpleTaxon {
  sciName: string;
  comName: string;
  speciesCode: string;
  category: EbirdCategory;
  order?: EbirdOrder;
  familyComName?: string;
  familySciName?: string;
}

export interface EBirdTaxon {
  sciName: string;
  comName: string;
  speciesCode: string;
  category: EbirdCategory;
  taxonOrder: number;
  bandingCodes: string[];
  comNameCodes: string[];
  sciNameCodes: string[];
  order?: EbirdOrder;
  familyCode?: string;
  familyComName?: string;
  familySciName?: string;
  reportAs?: string;
  extinct?: boolean;
  extinctYear?: number;
  acronym?: string;
}

export enum EbirdCategory {
  Domestic = "domestic",
  Form = "form",
  Hybrid = "hybrid",
  Intergrade = "intergrade",
  Issf = "issf",
  Slash = "slash",
  Species = "species",
  Spuh = "spuh",
}

export enum EbirdOrder {
  Accipitriformes = "Accipitriformes",
  Anseriformes = "Anseriformes",
  Apterygiformes = "Apterygiformes",
  Bucerotiformes = "Bucerotiformes",
  Caprimulgiformes = "Caprimulgiformes",
  Cariamiformes = "Cariamiformes",
  Casuariiformes = "Casuariiformes",
  Cathartiformes = "Cathartiformes",
  Charadriiformes = "Charadriiformes",
  Ciconiiformes = "Ciconiiformes",
  Coliiformes = "Coliiformes",
  Columbiformes = "Columbiformes",
  Coraciiformes = "Coraciiformes",
  Cuculiformes = "Cuculiformes",
  Eurypygiformes = "Eurypygiformes",
  Falconiformes = "Falconiformes",
  Galbuliformes = "Galbuliformes",
  Galliformes = "Galliformes",
  Gaviiformes = "Gaviiformes",
  Gruiformes = "Gruiformes",
  Leptosomiformes = "Leptosomiformes",
  Mesitornithiformes = "Mesitornithiformes",
  Musophagiformes = "Musophagiformes",
  Opisthocomiformes = "Opisthocomiformes",
  Otidiformes = "Otidiformes",
  Passeriformes = "Passeriformes",
  Pelecaniformes = "Pelecaniformes",
  Phaethontiformes = "Phaethontiformes",
  Phoenicopteriformes = "Phoenicopteriformes",
  Piciformes = "Piciformes",
  Podicipediformes = "Podicipediformes",
  Procellariiformes = "Procellariiformes",
  Psittaciformes = "Psittaciformes",
  Pterocliformes = "Pterocliformes",
  Rheiformes = "Rheiformes",
  Sphenisciformes = "Sphenisciformes",
  Strigiformes = "Strigiformes",
  Struthioniformes = "Struthioniformes",
  Suliformes = "Suliformes",
  Tinamiformes = "Tinamiformes",
  Trogoniformes = "Trogoniformes",
}
