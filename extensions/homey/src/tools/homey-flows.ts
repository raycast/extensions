import { Homey } from "../lib/Homey";

type Flow = {
  flowName: string;
  flowId: string;
  advanced: boolean;
};

export default async function tool(): Promise<Flow[]> {
  const homey = new Homey();
  await homey.auth();
  await homey.selectFirstHomey();
  const flows = await homey.getFlowsWithFolders();
  return flows
    .map((flowGroup) =>
      flowGroup.flows.map((flow) => ({
        flowName: flowGroup.name + " - " + flow.name,
        flowId: flow.id,
        advanced: Boolean(flow.advanced),
      })),
    )
    .flat();
}
