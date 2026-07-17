interface ArtifactPiece {
  chsName: string;
  enName: string;
  icon: string;
  ptName: string;
  ruName: string;
}

interface ArtifactSetBonuses {
  "2pc": string;
  "4pc"?: string;
}

interface ArtifactSet {
  setId: number;
  setIcon: string;
  qualityType: GenshinQualityType;
  releaseDate: number;

  chsName: string;
  enName: string;
  ptName: string;
  ruName: string;

  chsBonuses: ArtifactSetBonuses;
  enBonuses: ArtifactSetBonuses;
  ptBonuses: ArtifactSetBonuses;
  ruBonuses: ArtifactSetBonuses;

  pieces: {
    flower: ArtifactPiece;
    plume: ArtifactPiece;
    sands: ArtifactPiece;
    goblet: ArtifactPiece;
    circlet: ArtifactPiece;
  };
}

type ArtifactsMap = Record<string, ArtifactSet>;
