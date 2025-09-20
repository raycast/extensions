export type Organization = {
  id: string;
  name: string;
  slug: string;
};

export type Project = {
  id: string;
  name: string;
  organization: Organization;
  slug: string;
  color: string;
  dateCreated: string;
  baseUrl?: string;
};

export type Issue = {
  id: string;
  count: number;
  lastSeen: string;
  level: string;
  permalink: string;
  title: string;
  shortId: string;
  userCount: number;
  project: {
    id: string;
    name: string;
    slug: string;
  };
  assignedTo?: User | Team;
  culprit: string;
  firstSeen: string;
  tags: string[];
  baseUrl?: string;
};

export type Tag = {
  value?: string;
  key?: string;
};

export interface Event {
  eventID: string;
  dist: string;
  previousEventID: string;
  message: string;
  id: string;
  size: number;
  errors: {
    message?: string;
    type?: string;
    data?: {
      [k: string]: unknown;
    };
    [k: string]: unknown;
  }[];
  platform: string;
  tags: Tag[];
  dateCreated: string;
  dateReceived: string;
  user: {
    username: string;
    name: string;
    ip_address: string;
    email: string;
    id: string;
  };
  entries: (Breadcrumbs | Request | Message | Exception)[];
  contexts: {
    app?: AppContext;
    device?: DeviceContext;
    os?: OperatingSystemContext;
  };
  sdk: {
    version?: string;
    name?: string;
  };
  groupID: string;
  title: string;
}

export type Message = {
  type: "message";
  data: {
    formatted: string;
  };
};

export type Exception = {
  type: "exception";
  data: {
    excOmitted: number[];
    hasSystemFrames: boolean;
    values: {
      stacktrace: {
        frames: {
          function: string;
          errors: string;
          colNo: number;
          package: string;
          absPath: string;
          inApp: boolean;
          lineNo: number;
          module: string;
          filename: string;
          platform: string;
          instructionAddr: string;
          context: (number | string)[][];
          symbolAddr: string;
          trust: string;
          symbol: string;
        }[];
        framesOmitted: string;
        registers: string;
        hasSystemFrames: boolean;
      };
      module: string;
      rawStacktrace: {
        [k: string]: unknown;
      };
      threadId: string;
      value: string;
      type: string;
    }[];
  };
};

export type Breadcrumbs = {
  type: "breadcrumbs";
  data: {
    values: Breadcrumb[];
  };
};

export type Breadcrumb = DefaultBreadcrumb | HTTPBreadcrumb | DebugBreadcrumb | InfoBreadcrumb | ErrorBreadcrumb;

export type DefaultBreadcrumb = {
  category: string;
  level: string;
  event_id: string;
  timestamp: string;
  message: string;
  data: {
    location?: string;
  };
  type: "default";
};

export type HTTPBreadcrumb = {
  type: "http";
  timestamp: string;
  level: string;
  category: "http";
  data: {
    method: string;
    reason: string;
    request_body_size: number;
    response_body_size: number;
    status_code?: number;
    url: string;
  };
  event_id: null;
};

export type DebugBreadcrumb = {
  type: "debug";
  timestamp: string;
  level: string;
  message: string;
  category: "string";
  data: object;
};

export type InfoBreadcrumb = {
  type: "info";
  timestamp: string;
  level: string;
  message: string;
  category: "string";
  data: object;
};

export type ErrorBreadcrumb = {
  type: "error";
  timestamp: string;
  level: string;
  message: string;
  category: "string";
  data: object;
};

export type Request = {
  type: string;
  data: {
    fragment: string;
    cookies: string[][];
    inferredContentType: string;
    env: {
      ENV?: string;
    };
    headers: string[][];
    url: string;
    query: string[][];
    data: {
      [k: string]: unknown;
    };
    method: string;
  };
};

type AppContext = {
  type: "app";
  app_identifier: string;
  app_name: string;
  app_version: string;
};

type DeviceContext = {
  type: "device";
  family: string;
  model: string;
};

type OperatingSystemContext = {
  type: "os";
  name: string;
  version: string;
  build: string;
};

export type User = {
  email: string;
  type: "user";
  id: string;
  name: string;
  user?: {
    id: string;
  };
};

export type Team = {
  type: "team";
  name: string;
};
