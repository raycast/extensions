export interface Service {
  id: string;
  name: string;
  digits: number;
  period: number;
  seed: string | null;
  accountType?: string;
  issuer?: string;
  logo?: string;
  type: "authy" | "service";
}
