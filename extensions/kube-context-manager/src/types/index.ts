// Kubernetes cluster metadata
export interface ClusterDetails {
  name: string;
  server: string;
  isSecure: boolean;
  hasCA: boolean;
  protocol: string;
  hostname: string;
  port: string;
}

// Kubernetes context interface
export interface KubernetesContext {
  name: string;
  cluster: string;
  user: string;
  namespace?: string;
  current?: boolean;
  clusterDetails?: ClusterDetails;
  userAuthMethod?: string;
}

export interface ContextListItem {
  id: string;
  title: string;
  subtitle: string;
  accessories: Array<{ text: string; tooltip?: string }>;
  context: KubernetesContext;
}

// Error handling
export class ContextNotFoundError extends Error {
  constructor(contextName: string) {
    super(`Context "${contextName}" not found`);
    this.name = "ContextNotFoundError";
  }
}
