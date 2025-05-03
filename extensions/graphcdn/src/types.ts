export type GetOrganizationsResponse = {
  organizations: {
    edges: Array<{
      node: {
        name: string;
        slug: string;
        id: string;
      };
    }>;
  };
};

export type GetServicesResponse = {
  organization: {
    services: {
      edges: Array<{
        node: {
          name: string;
          cdnEndpoint: string;
          metrics: {
            summary: {
              cacheHitRate: number;
            };
          };
        };
      }>;
    };
  };
};

export type SuccessResponse<T> = {
  data: T;
};
export type ErrorResponse = {
  errors: Array<{
    message: string;
    extensions:
      | {
          code: string;
        }
      | {
          [key: string]: {
            code: string;
            details?: unknown;
          };
        };
  }>;
};
