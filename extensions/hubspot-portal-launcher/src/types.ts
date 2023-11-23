enum Filter {
  All = "All",
  Prod = "Production",
  Dev = "Dev",
  Test = "Test",
  CMSSandbox = "CMS Sandbox",
  Sandbox = "Sandbox",
}

enum PortalType {
  Prod = "Production",
  Sandbox = "Sandbox",
  CMSSandbox = "CMS Sandbox",
  Dev = "Dev",
  Test = "Test",
}

interface Portal {
  id: string;
  portalId: string;
  portalName: string;
  portalType: PortalType;
}

export type { Portal };
export { PortalType, Filter };
