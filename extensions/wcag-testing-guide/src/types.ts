export type WcagVersion = "2.1" | "2.2";
export type ConformanceLevel = "A" | "AA" | "AAA";
export type Principle =
  "Perceivable" | "Operable" | "Understandable" | "Robust";

export type Criterion = {
  number: string;
  slug: string;
  title: string;
  level: ConformanceLevel;
  principle: Principle;
  guideline: string;
  introduced: "2.0" | "2.1" | "2.2";
  removedIn22?: boolean;
  plain: string;
  technical: string;
  apply: string[];
  test: string[];
  keywords: string[];
};
