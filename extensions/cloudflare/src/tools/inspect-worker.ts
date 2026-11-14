import { withCloudflareAccessToken, getCloudflareService } from '../oauth';
import { resolveAccount } from './helpers';

interface Input {
  /** Account ID returned by List Zones or List Workers. */
  accountId: string;
  /** Worker name returned by List Workers. */
  workerName: string;
  /** Optional version ID. Omit to inspect the newest version. */
  versionId?: string;
}

async function tool(input: Input) {
  const account = await resolveAccount(input.accountId);
  const workers = await getCloudflareService().listWorkers(account.id);
  const worker = workers.find((worker) => worker.id === input.workerName);
  if (!worker) {
    throw new Error(
      'workerName was not found in this account. Call List Workers first.',
    );
  }

  const versions = await getCloudflareService().listWorkerVersions(
    account.id,
    worker.id,
  );
  const selected = input.versionId
    ? versions.find((version) => version.id === input.versionId)
    : versions
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdOn ?? 0).getTime() -
            new Date(a.createdOn ?? 0).getTime(),
        )[0];
  if (!selected) {
    throw new Error(
      input.versionId
        ? 'versionId was not found. Call Inspect Worker without versionId to inspect the newest version and see availableVersions.'
        : 'Cloudflare did not return any versions for this Worker.',
    );
  }

  const detail = await getCloudflareService().getWorkerVersionDetail(
    account.id,
    worker.id,
    selected.id,
  );
  return {
    accountId: account.id,
    accountName: account.name,
    worker: {
      name: worker.id,
      modifiedOn: worker.modifiedOn,
      compatibilityDate: worker.compatibilityDate,
      compatibilityFlags: worker.compatibilityFlags,
    },
    selectedVersion: {
      id: detail.id,
      number: detail.number,
      createdOn: detail.createdOn,
      source: detail.source,
      lastDeployedFrom: detail.lastDeployedFrom,
      compatibilityDate: detail.compatibilityDate,
      compatibilityFlags: detail.compatibilityFlags,
      handlers: detail.handlers,
      namedHandlers: detail.namedHandlers,
      exports: detail.exports,
      cpuLimitMs: detail.cpuLimitMs,
      usageModel: detail.usageModel,
      bindings: detail.bindings.map((binding) => ({
        name: binding.name,
        type: binding.type,
        resource: binding.resource,
      })),
    },
    availableVersions: versions.slice(0, 10).map((version) => ({
      id: version.id,
      number: version.number,
      createdOn: version.createdOn,
      source: version.source,
    })),
  };
}

export default withCloudflareAccessToken(tool);
