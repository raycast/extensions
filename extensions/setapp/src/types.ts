export interface SetappResponse {
  data: {
    relationships: {
      vendors: {
        data: SetappVendor[];
      };
    };
  };
}

interface SetappVendor {
  id: number;
  attributes: {
    name: string;
  };
  relationships: {
    applications: {
      data: SetappApp[];
    };
    mobile_applications: {
      data: SetappApp[];
    };
  };
}

export interface SetappApp {
  id: number;
  attributes: {
    name: string;
    bundle_id: string;
    icon: string;
    description: string;
    tag_line: string;
    marketing_url: string;
    sharing_url: string;
  };
}

export interface App {
  id: number;
  name: string;
  bundle_id: string;
  icon: string;
  description: string;
  tag_line: string;
  marketing_url: string;
  sharing_url: string;
  vendor_id: number;
  type: string;
  installed?: boolean;
  path?: string;
}
