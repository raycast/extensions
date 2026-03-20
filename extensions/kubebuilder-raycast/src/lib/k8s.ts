import type { KubeApiResource } from "./kubectl";

export interface BuildGenericManifestInput {
  resource: KubeApiResource;
  name: string;
  namespace?: string;
  labels?: string;
  annotations?: string;
  bodyValues?: Record<string, unknown>;
}

export interface BuildManifestResult {
  fileName: string;
  kind: string;
  manifest: Record<string, unknown>;
}

function requireField(value: string | undefined, fieldName: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

function isDnsLabel(value: string): boolean {
  return /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(value) && value.length <= 63;
}

function parseKeyValueMap(
  value: string | undefined,
  label: string,
): Record<string, string> {
  const result: Record<string, string> = {};

  if (!value?.trim()) {
    return result;
  }

  const pairs = value
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const pair of pairs) {
    const index = pair.indexOf("=");
    if (index < 1 || index === pair.length - 1) {
      throw new Error(`Invalid ${label} entry: ${pair}. Use key=value format`);
    }

    const key = pair.slice(0, index).trim();
    const val = pair.slice(index + 1).trim();

    if (!key || !val) {
      throw new Error(`Invalid ${label} entry: ${pair}. Use key=value format`);
    }

    result[key] = val;
  }

  return result;
}

function withCommonMetadata(
  name: string,
  namespace: string | undefined,
  labels: Record<string, string>,
  annotations?: Record<string, string>,
) {
  return {
    name,
    ...(namespace ? { namespace } : {}),
    ...(Object.keys(labels).length > 0 ? { labels } : {}),
    ...(annotations && Object.keys(annotations).length > 0
      ? { annotations }
      : {}),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(source)) {
    const existing = result[key];

    if (isObject(value) && isObject(existing)) {
      result[key] = deepMerge(existing, value);
      continue;
    }

    result[key] = value;
  }

  return result;
}

export function getGenericBodyTemplate(
  resource: KubeApiResource,
  name: string,
): Record<string, unknown> {
  switch (resource.kind) {
    case "ConfigMap":
      return {
        data: {
          EXAMPLE_KEY: "example-value",
        },
      };
    case "Secret":
      return {
        type: "Opaque",
        stringData: {
          EXAMPLE_KEY: "example-value",
        },
      };
    case "Service":
      return {
        spec: {
          selector: {
            app: name,
          },
          ports: [
            {
              port: 80,
              targetPort: 80,
            },
          ],
        },
      };
    case "Pod":
      return {
        spec: {
          containers: [
            {
              name,
              image: "nginx:latest",
              ports: [{ containerPort: 80 }],
            },
          ],
        },
      };
    case "Deployment":
      return {
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              app: name,
            },
          },
          template: {
            metadata: {
              labels: {
                app: name,
              },
            },
            spec: {
              containers: [
                {
                  name,
                  image: "nginx:latest",
                  ports: [{ containerPort: 80 }],
                },
              ],
            },
          },
        },
      };
    case "DaemonSet":
      return {
        spec: {
          selector: {
            matchLabels: {
              app: name,
            },
          },
          template: {
            metadata: {
              labels: {
                app: name,
              },
            },
            spec: {
              containers: [
                {
                  name,
                  image: "nginx:latest",
                  ports: [{ containerPort: 80 }],
                },
              ],
            },
          },
        },
      };
    case "StatefulSet":
      return {
        spec: {
          serviceName: `${name}-headless`,
          replicas: 1,
          selector: {
            matchLabels: {
              app: name,
            },
          },
          template: {
            metadata: {
              labels: {
                app: name,
              },
            },
            spec: {
              containers: [
                {
                  name,
                  image: "nginx:latest",
                  ports: [{ containerPort: 80 }],
                },
              ],
            },
          },
        },
      };
    case "Job":
      return {
        spec: {
          template: {
            spec: {
              restartPolicy: "Never",
              containers: [
                {
                  name,
                  image: "busybox:latest",
                  command: ["sh", "-c", "echo hello from job"],
                },
              ],
            },
          },
        },
      };
    case "CronJob":
      return {
        spec: {
          schedule: "*/5 * * * *",
          jobTemplate: {
            spec: {
              template: {
                spec: {
                  restartPolicy: "Never",
                  containers: [
                    {
                      name,
                      image: "busybox:latest",
                      command: ["sh", "-c", "date; echo hello from cronjob"],
                    },
                  ],
                },
              },
            },
          },
        },
      };
    case "Ingress":
      return {
        spec: {
          rules: [
            {
              host: "example.com",
              http: {
                paths: [
                  {
                    path: "/",
                    pathType: "Prefix",
                    backend: {
                      service: {
                        name,
                        port: {
                          number: 80,
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      };
    default:
      return {
        spec: {},
      };
  }
}

function normalizeCommonFields(
  nameValue: string,
  namespaceValue: string | undefined,
) {
  const name = requireField(nameValue, "Name");
  if (!isDnsLabel(name)) {
    throw new Error(
      "Name must be a valid DNS-1123 label (lowercase alphanumeric and '-')",
    );
  }

  const namespace = namespaceValue?.trim();
  if (namespace && !isDnsLabel(namespace)) {
    throw new Error(
      "Namespace must be a valid DNS-1123 label (lowercase alphanumeric and '-')",
    );
  }

  return { name, namespace };
}

export function buildGenericManifest(
  input: BuildGenericManifestInput,
): BuildManifestResult {
  const { name, namespace } = normalizeCommonFields(
    input.name,
    input.namespace,
  );
  const labels = parseKeyValueMap(input.labels, "label");
  const annotations = parseKeyValueMap(input.annotations, "annotation");
  const metadata = withCommonMetadata(
    name,
    input.resource.namespaced ? namespace : undefined,
    labels,
    annotations,
  );

  const manifest = deepMerge(
    {
      apiVersion: input.resource.apiVersion,
      kind: input.resource.kind,
      metadata,
    },
    input.bodyValues ?? {},
  );

  return {
    fileName: `${name}-${input.resource.name}.yaml`,
    kind: input.resource.kind,
    manifest,
  };
}
