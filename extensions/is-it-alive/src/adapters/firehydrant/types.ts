export interface FireHydrantComponent {
  id: string;
  name: string;
  condition?: string;
}

export interface FireHydrantIncident {
  id: string;
  title: string;
  timestamps?: {
    started?: string;
    resolved?: string;
    [key: string]: string | undefined;
  };
  components?: FireHydrantComponent[];
  componentConditions?: Record<string, string>;
  severitySlug?: string;
}

export interface FireHydrantPayload {
  config: {
    title?: string;
    companyName?: string;
    operationalMessage?: string;
  };
  components: Array<{ id: string; name: string }>;
  conditions?: Record<string, string>;
  incidents: FireHydrantIncident[];
}
