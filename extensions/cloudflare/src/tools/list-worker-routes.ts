import { getCloudflareService, withCloudflareAccessToken } from '../oauth';
import { resolveZone } from './helpers';

interface Input {
  /** Zone ID returned by List Zones. */
  zoneId: string;
}

async function tool(input: Input) {
  const context = await resolveZone(input.zoneId);
  const routes = await getCloudflareService().listWorkerRoutes(context.zone.id);
  return {
    accountId: context.account.id,
    accountName: context.account.name,
    zoneId: context.zone.id,
    zoneName: context.zone.name,
    routes: routes.map((route) => ({
      id: route.id,
      pattern: route.pattern,
      workerName: route.script,
      enabled: Boolean(route.script),
    })),
  };
}

export default withCloudflareAccessToken(tool);
