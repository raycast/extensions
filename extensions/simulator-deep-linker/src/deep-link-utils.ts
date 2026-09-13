export type LinkEnvironment = {
  id: string;
  name: string;
  variables: Record<string, string>;
  isBuiltIn?: boolean;
};

export const builtInEnvironments: LinkEnvironment[] = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Development", variables: {}, isBuiltIn: true },
  { id: "00000000-0000-0000-0000-000000000002", name: "Production", variables: {}, isBuiltIn: true },
];

export function resolveDeepLink(source: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (value, [key, replacement]) =>
      value.replaceAll(`{{${key}}}`, () => replacement).replaceAll(`\${${key}}`, () => replacement),
    source,
  );
}

export function findUnresolvedVariables(value: string): string[] {
  const variables = new Set<string>();
  for (const match of value.matchAll(/{{\s*([^{}]+?)\s*}}|\${([^{}]+)}/g)) {
    variables.add((match[1] || match[2]).trim());
  }
  return [...variables];
}

export function assertCanOpen(urlString: string, environmentName: string): void {
  const unresolvedVariables = findUnresolvedVariables(urlString);
  if (unresolvedVariables.length > 0) {
    throw new Error(
      `Configure ${unresolvedVariables.join(", ")} in the ${environmentName} environment before opening this link.`,
    );
  }

  try {
    new URL(urlString);
  } catch {
    throw new Error("The deep link is malformed or does not include a URL scheme (for example, myapp://).");
  }
}

export function buildADBRemoteCommand(urlString: string, androidPackage?: string): string {
  const argumentsList = ["am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", urlString];
  const normalizedPackage = androidPackage?.trim();
  if (normalizedPackage) argumentsList.push("-p", normalizedPackage);
  return argumentsList.map(quoteRemoteShellArgument).join(" ");
}

export function quoteRemoteShellArgument(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function decodeEnvironments(source: string): LinkEnvironment[] {
  const parsed: unknown = JSON.parse(source);
  if (!Array.isArray(parsed)) {
    throw new Error("The environments file does not contain an environment list.");
  }

  const seenIDs = new Set<string>();
  const environments = parsed.map((value, index) => {
    if (!isRecord(value)) throw invalidEnvironment(index);
    const { id, name, variables, isBuiltIn } = value;
    if (
      !isUUID(id) ||
      typeof name !== "string" ||
      (variables !== undefined && !isStringRecord(variables)) ||
      (isBuiltIn !== undefined && typeof isBuiltIn !== "boolean") ||
      seenIDs.has(id.toLowerCase())
    ) {
      throw invalidEnvironment(index);
    }
    seenIDs.add(id.toLowerCase());
    return { id, name, variables: variables ?? {}, isBuiltIn: isBuiltIn ?? false };
  });

  return withBuiltInEnvironments(environments);
}

export function withBuiltInEnvironments(source: LinkEnvironment[]): LinkEnvironment[] {
  const [defaultDevelopment, defaultProduction] = builtInEnvironments;
  const development =
    source.find((environment) => environment.id.toLowerCase() === defaultDevelopment.id.toLowerCase()) ??
    source.find(
      (environment) => environment.name.localeCompare("Development", undefined, { sensitivity: "accent" }) === 0,
    ) ??
    defaultDevelopment;
  const production =
    source.find((environment) => environment.id.toLowerCase() === defaultProduction.id.toLowerCase()) ??
    source.find(
      (environment) => environment.name.localeCompare("Production", undefined, { sensitivity: "accent" }) === 0,
    ) ??
    defaultProduction;

  const builtIns = [
    { ...development, id: defaultDevelopment.id, name: defaultDevelopment.name, isBuiltIn: true },
    { ...production, id: defaultProduction.id, name: defaultProduction.name, isBuiltIn: true },
  ];
  const builtInIDs = new Set(builtInEnvironments.map((environment) => environment.id.toLowerCase()));
  const customEnvironments = source.filter(
    (environment) =>
      !builtInIDs.has(environment.id.toLowerCase()) &&
      environment.name.localeCompare("Development", undefined, { sensitivity: "accent" }) !== 0 &&
      environment.name.localeCompare("Production", undefined, { sensitivity: "accent" }) !== 0,
  );
  return [...builtIns, ...customEnvironments];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function isUUID(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function invalidEnvironment(index: number): Error {
  return new Error(`Environment at index ${index} has an invalid format.`);
}
