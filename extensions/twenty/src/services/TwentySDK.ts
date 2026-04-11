import { createTwentyClient } from "./client";
import { getTwentyConfig } from "./preferences";
import { createMetadataService } from "./metadata";
import { createRecordsService } from "./records";

export const buildServices = () => {
  const client = createTwentyClient(getTwentyConfig());

  return {
    metadata: createMetadataService(client),
    records: createRecordsService(client),
  };
};

const services = buildServices();

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const withLegacyMetadataFailureContract =
  <TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>) =>
  async (...args: TArgs): Promise<TResult | string> => {
    try {
      return await fn(...args);
    } catch (error) {
      return getErrorMessage(error);
    }
  };

const twenty = {
  getActiveDataModels: withLegacyMetadataFailureContract(services.metadata.getActiveDataModels),
  getRecordFieldsForDataModel: withLegacyMetadataFailureContract(services.metadata.getRecordFieldsForDataModel),
  createObjectRecord: services.records.createObjectRecord,
};

export default twenty;
