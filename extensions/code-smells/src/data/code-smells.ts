import { CodeSmell } from "./types";

export const CodeSmells: CodeSmell[] = [
  {
    name: "Combinatorial Explosion",
    link: "https://luzkan.github.io/smells/combinatorial-explosion",
    categories: {
      Obstruction: ["Bloaters"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Responsibility"],
    },
  },
  {
    name: "Data Clump",
    link: "https://luzkan.github.io/smells/data-clump",
    categories: {
      Obstruction: ["Bloaters"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Data"],
    },
  },
  {
    name: "Large Class",
    link: "https://luzkan.github.io/smells/large-class",
    categories: {
      Obstruction: ["Bloaters"],
      SmellHierarchies: ["Code Smell", "Design Smell", "Antipattern", "Architecture Smell"],
      Ocurrence: ["Measured Smells"],
    },
  },
  {
    name: "Long Method",
    link: "https://luzkan.github.io/smells/long-method",
    categories: {
      Obstruction: ["Bloaters"],
      SmellHierarchies: ["Code Smell", "Design Smell", "Antipattern", "Implementation Smell"],
      Ocurrence: ["Measured Smells"],
    },
  },
  {
    name: "Long Parameter List",
    link: "https://luzkan.github.io/smells/long-parameter-list",
    categories: {
      Obstruction: ["Bloaters"],
      SmellHierarchies: ["Code Smell", "Design Smell", "Antipattern", "Architecture Smell"],
      Ocurrence: ["Measured Smells"],
    },
  },
  {
    name: "Null Check",
    link: "https://luzkan.github.io/smells/null-check",
    categories: {
      Obstruction: ["Bloaters"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Conditional Logic"],
    },
  },
  {
    name: "Oddball Solution",
    link: "https://luzkan.github.io/smells/oddball-solution",
    categories: {
      Obstruction: ["Bloaters"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Duplication"],
    },
  },
  {
    name: "Primitive Obsession",
    link: "https://luzkan.github.io/smells/primitive-obsession",
    categories: {
      Obstruction: ["Bloaters"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Data"],
    },
  },
  {
    name: "Required Setup or Teardown Code",
    link: "https://luzkan.github.io/smells/required-setup-or-teardown-code",
    categories: {
      Obstruction: ["Bloaters"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Responsibility"],
    },
  },
  // ChangePreventers
  {
    name: "Callback Hell",
    link: "https://luzkan.github.io/smells/callback-hell",
    categories: {
      Obstruction: ["Change Preventers"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Conditional Logic"],
    },
  },
  {
    name: "Divergent Change",
    link: "https://luzkan.github.io/smells/divergent-change",
    categories: {
      Obstruction: ["Change Preventers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Responsibility"],
    },
  },
  {
    name: "Dubious Abstraction",
    link: "https://luzkan.github.io/smells/dubious-abstraction",
    categories: {
      Obstruction: ["Change Preventers"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Responsibility"],
    },
  },
  {
    name: "Flag Argument",
    link: "https://luzkan.github.io/smells/flag-argument",
    categories: {
      Obstruction: ["Change Preventers"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Conditional Logic"],
    },
  },
  {
    name: "Parallel Inheritance Hierarchies",
    link: "https://luzkan.github.io/smells/parallel-inheritance-hierarchies",
    categories: {
      Obstruction: ["Change Preventers"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Responsibility"],
    },
  },
  {
    name: "Shotgun Surgery",
    link: "https://luzkan.github.io/smells/shotgun-surgery",
    categories: {
      Obstruction: ["Change Preventers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Responsibility"],
    },
  },
  {
    name: "Special Case",
    link: "https://luzkan.github.io/smells/special-case",
    categories: {
      Obstruction: ["Change Preventers"],
      SmellHierarchies: ["Code Smell", "Implementation Smell"],
      Ocurrence: ["Conditional Logic"],
    },
  },
  // Couplers
  {
    name: "Afraid To Fail",
    link: "https://luzkan.github.io/smells/afraid-to-fail",
    categories: {
      Obstruction: ["Couplers"],
      SmellHierarchies: ["Code Smell", "Implementation Smell"],
      Ocurrence: ["Responsibility"],
    },
  },
  {
    name: "Binary Operator in Name",
    link: "https://luzkan.github.io/smells/binary-operator-in-name",
    categories: {
      Obstruction: ["Couplers"],
      SmellHierarchies: ["Code Smell", "Linguistic Smell"],
      Ocurrence: ["Names"],
    },
  },
  {
    name: "Fate over Action",
    link: "https://luzkan.github.io/smells/fate-over-action",
    categories: {
      Obstruction: ["Couplers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Responsibility"],
    },
  },
  {
    name: "Feature Envy",
    link: "https://luzkan.github.io/smells/feature-envy",
    categories: {
      Obstruction: ["Couplers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Responsibility"],
    },
  },
  {
    name: "Indecent Exposure",
    link: "https://luzkan.github.io/smells/indecent-exposure",
    categories: {
      Obstruction: ["Couplers"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Data"],
    },
  },
  {
    name: "Type Embedded in Name",
    link: "https://luzkan.github.io/smells/type-embedded-in-name",
    categories: {
      Obstruction: ["Couplers"],
      SmellHierarchies: ["Code Smell", "Implementation Smell", "Linguistic Smell"],
      Ocurrence: ["Names"],
    },
  },
  // DataDealers
  {
    name: "Global Data",
    link: "https://luzkan.github.io/smells/global-data",
    categories: {
      Obstruction: ["Data Dealers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Data"],
    },
  },
  {
    name: "Hidden Dependencies",
    link: "https://luzkan.github.io/smells/hidden-dependencies",
    categories: {
      Obstruction: ["Data Dealers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Data"],
    },
  },
  {
    name: "Insider Trading",
    link: "https://luzkan.github.io/smells/insider-trading",
    categories: {
      Obstruction: ["Data Dealers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Responsibility"],
    },
  },
  {
    name: "Message Chain",
    link: "https://luzkan.github.io/smells/message-chain",
    categories: {
      Obstruction: ["Data Dealers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Message Calls"],
    },
  },
  {
    name: "Middle Man",
    link: "https://luzkan.github.io/smells/middle-man",
    categories: {
      Obstruction: ["Data Dealers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Message Calls"],
    },
  },
  {
    name: "Tramp Data",
    link: "https://luzkan.github.io/smells/tramp-data",
    categories: {
      Obstruction: ["Data Dealers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Data"],
    },
  },
  // Dispensable
  {
    name: "Duplicated Code",
    link: "https://luzkan.github.io/smells/duplicated-code",
    categories: {
      Obstruction: ["Dispensables"],
      SmellHierarchies: ["Code Smell", "Design Smell", "Implementation Smell"],
      Ocurrence: ["Duplication"],
    },
  },
  {
    name: "Dead Code",
    link: "https://luzkan.github.io/smells/dead-code",
    categories: {
      Obstruction: ["Dispensables"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Unnecessary Complexity"],
    },
  },
  {
    name: "Lazy Element",
    link: "https://luzkan.github.io/smells/lazy-element",
    categories: {
      Obstruction: ["Dispensables"],
      SmellHierarchies: ["Code Smell", "Antipattern", "Design Smell"],
      Ocurrence: ["Unnecessary Complexity"],
    },
  },
  {
    name: "Speculative Generality",
    link: "https://luzkan.github.io/smells/speculative-generality",
    categories: {
      Obstruction: ["Dispensables"],
      SmellHierarchies: ["Code Smell", "Antipattern", "Design Smell"],
      Ocurrence: ["Unnecessary Complexity"],
    },
  },
  {
    name: '"What" Comment',
    link: "https://luzkan.github.io/smells/what-comment",
    categories: {
      Obstruction: ["Dispensables"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Names"],
    },
  },
  // functionalAbusers
  {
    name: "Imperative Loops",
    link: "https://luzkan.github.io/smells/imperative-loops",
    categories: {
      Obstruction: ["Functional Abusers"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Unnecessary Complexity"],
    },
  },
  {
    name: "Mutable Data",
    link: "https://luzkan.github.io/smells/mutable-data",
    categories: {
      Obstruction: ["Functional Abusers"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Data"],
    },
  },
  {
    name: "Side Effects",
    link: "https://luzkan.github.io/smells/side-effects",
    categories: {
      Obstruction: ["Functional Abusers"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Responsibility"],
    },
  },
  // lexicalAbusers
  {
    name: "Fallacious Comment",
    link: "https://luzkan.github.io/smells/fallacious-comment",
    categories: {
      Obstruction: ["Lexical Abusers"],
      SmellHierarchies: ["Code Smell", "Linguistic Smell"],
      Ocurrence: ["Names"],
    },
  },
  {
    name: "Fallacious Method Name",
    link: "https://luzkan.github.io/smells/fallacious-method-name",
    categories: {
      Obstruction: ["Lexical Abusers"],
      SmellHierarchies: ["Code Smell", "Implementation Smell", "Linguistic Smell"],
      Ocurrence: ["Names"],
    },
  },
  {
    name: "Boolean Blindness",
    link: "https://luzkan.github.io/smells/boolean-blindness",
    categories: {
      Obstruction: ["Lexical Abusers"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Names"],
    },
  },
  {
    name: "Inconsistent Names",
    link: "https://luzkan.github.io/smells/inconsistent-names",
    categories: {
      Obstruction: ["Lexical Abusers"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Names"],
    },
  },
  {
    name: "Magic Number",
    link: "https://luzkan.github.io/smells/magic-number",
    categories: {
      Obstruction: ["Lexical Abusers"],
      SmellHierarchies: ["Code Smell", "Antipattern", "Implementation Smell"],
      Ocurrence: ["Names"],
    },
  },
  {
    name: "Uncommunicative Name",
    link: "https://luzkan.github.io/smells/uncommunicative-name",
    categories: {
      Obstruction: ["Lexical Abusers"],
      SmellHierarchies: ["Code Smell", "Implementation Smell"],
      Ocurrence: ["Names"],
    },
  },
  // Obfuscator
  {
    name: "Clever Code",
    link: "https://luzkan.github.io/smells/clever-code",
    categories: {
      Obstruction: ["Obfuscator"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Unnecessary Complexity"],
    },
  },
  {
    name: "Complicated Boolean Expression",
    link: "https://luzkan.github.io/smells/complicated-boolean-expression",
    categories: {
      Obstruction: ["Obfuscator"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Conditional Logic"],
    },
  },
  {
    name: "Complicated Regex Expression",
    link: "https://luzkan.github.io/smells/complicated-regex-expression",
    categories: {
      Obstruction: ["Obfuscator"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Names"],
    },
  },
  {
    name: "Inconsistent Style",
    link: "https://luzkan.github.io/smells/inconsistent-style",
    categories: {
      Obstruction: ["Obfuscator"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Names"],
    },
  },
  {
    name: "Obscured Intent",
    link: "https://luzkan.github.io/smells/obscured-intent",
    categories: {
      Obstruction: ["Obfuscator"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Unnecessary Complexity"],
    },
  },
  {
    name: "Status Variable",
    link: "https://luzkan.github.io/smells/status-variable",
    categories: {
      Obstruction: ["Obfuscator"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Unnecessary Complexity"],
    },
  },
  {
    name: "Vertical Separation",
    link: "https://luzkan.github.io/smells/vertical-separation",
    categories: {
      Obstruction: ["Obfuscator"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Measured Smells"],
    },
  },
  // ObjectOrientedAbusers
  {
    name: "Alternative Classes with Different Interfaces",
    link: "https://luzkan.github.io/smells/alternative-classes-with-different-interfaces",
    categories: {
      Obstruction: ["Object Oriented Abusers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Duplication"],
    },
  },
  {
    name: "Base Class depends on Subclass",
    link: "https://luzkan.github.io/smells/base-class-depends-on-subclass",
    categories: {
      Obstruction: ["Object Oriented Abusers"],
      SmellHierarchies: ["Code Smell", "Design Smell", "Antipattern"],
      Ocurrence: ["Interfaces"],
    },
  },
  {
    name: "Conditional Complexity",
    link: "https://luzkan.github.io/smells/conditional-complexity",
    categories: {
      Obstruction: ["Object Oriented Abusers"],
      SmellHierarchies: ["Code Smell", "Design Smell", "Implementation Smell"],
      Ocurrence: ["Conditional Logic"],
    },
  },
  {
    name: "Inappropriate Static",
    link: "https://luzkan.github.io/smells/inappropriate-static",
    categories: {
      Obstruction: ["Object Oriented Abusers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Interfaces"],
    },
  },
  {
    name: "Refused Bequest",
    link: "https://luzkan.github.io/smells/refused-bequest",
    categories: {
      Obstruction: ["Object Oriented Abusers"],
      SmellHierarchies: ["Code Smell", "Design Smell"],
      Ocurrence: ["Interfaces"],
    },
  },
  {
    name: "Temporary Field",
    link: "https://luzkan.github.io/smells/temporary-field",
    categories: {
      Obstruction: ["Object Oriented Abusers"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Data"],
    },
  },
  // Others
  {
    name: "Incomplete Library Class",
    link: "https://luzkan.github.io/smells/incomplete-library-class",
    categories: {
      Obstruction: ["Others"],
      SmellHierarchies: ["Code Smell"],
      Ocurrence: ["Interfaces"],
    },
  },
];
