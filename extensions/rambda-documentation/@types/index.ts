export type RambdaFunction = {
  href: string;
  addedInVersion: string;
  functionName: string;
  description: string;
  codeExample: string;
  seeAlso?: string;
};

export type RambdaFunctionList = Record<string, RambdaFunction>;
