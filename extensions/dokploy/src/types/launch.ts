import { ServiceRef } from "./dokploy";

/**
 * What the menu bar hands to the Deployments command when you pick "View Deployments" on a
 * service. Menu-bar commands cannot push a view of their own, so they launch the view command and
 * pass the service along in its launch context.
 *
 * This lives in its own module so the two commands don't import each other - that would pull the
 * whole view command into the menu bar's bundle.
 */
export interface DeploymentsLaunchContext {
  accountId: string;
  service: ServiceRef;
}
