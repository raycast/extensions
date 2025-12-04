import { EBirdTaxon } from "./ebird";

export interface Cache {
  timeout: number;
  taxons: EBirdTaxon[];
}
