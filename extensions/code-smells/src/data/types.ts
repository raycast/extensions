type LinkCodeSmell = `https://luzkan.github.io/smells/${string}`;

export type Obstruction =
  | "Bloaters"
  | "Change Preventers"
  | "Couplers"
  | "Data Dealers"
  | "Dispensables"
  | "Functional Abusers"
  | "Lexical Abusers"
  | "Obfuscator"
  | "Object Oriented Abusers"
  | "Others";

export type Ocurrence =
  | "Conditional Logic"
  | "Data"
  | "Duplication"
  | "Interfaces"
  | "Measured Smells"
  | "Message Calls"
  | "Names"
  | "Responsibility"
  | "Unnecessary Complexity";

export type SmellHierarchies =
  | "Antipattern"
  | "Architecture Smell"
  | "Code Smell"
  | "Design Smell"
  | "Implementation Smell"
  | "Linguistic Smell";

type Categories = {
  Obstruction: Obstruction[];
  Ocurrence: Ocurrence[];
  SmellHierarchies: SmellHierarchies[];
};

export interface CodeSmell {
  categories: Categories;
  name: string;
  link: LinkCodeSmell;
}
