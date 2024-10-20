export interface Service {
  id: string;
  name: string;
  type: "service";
  digits: number;
  period: number;
  seed: string | null;
}
