export type RamdaFunction = {
  href: string;
  addedInVersion: string;
  functionName: string;
  description: string;
  codeExample: string;
  seeAlso?: string;
};

export type RamdaFunctionList = Record<string, RamdaFunction>;
