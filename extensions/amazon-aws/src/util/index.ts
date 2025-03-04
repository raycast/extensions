import { AWS_URL_BASE } from "../constants";

export function getFilterPlaceholder(type: string, searchType?: string) {
  return `Filter ${type} by ${searchType ? searchType : "name"}`;
}

export function isReadyToFetch() {
  const isProfileSelected = !!process.env.AWS_PROFILE;
  const isAwsVaultSessionActive = !!process.env.AWS_VAULT;

  return isProfileSelected || isAwsVaultSessionActive;
}

export function resourceToConsoleLink(
  resourceId: string | undefined,
  resourceType: string,
  runId: string | undefined = undefined,
) {
  const { AWS_REGION } = process.env;

  if (!resourceId) return "";

  switch (resourceType) {
    case "AWS::SSM::Parameter":
      return `${AWS_URL_BASE}/systems-manager/parameters/${resourceId}/description?region=${AWS_REGION}`;
    case "AWS::SecretsManager::Secret":
      return `https://${AWS_REGION}.console.aws.amazon.com/secretsmanager/secret?name=${encodeURI(
        resourceId,
      )}&region=${AWS_REGION}`;
    case "AWS::EC2::Instance":
      return `${AWS_URL_BASE}/ec2/v2/home?region=${AWS_REGION}#InstanceDetails:instanceId=${resourceId}`;
    case "AWS::Logs::LogGroup":
      return `${AWS_URL_BASE}/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups/log-group/${encodeURIComponent(
        resourceId,
      )}`;
    case "AWS::CloudFormation::Stack":
      return `${AWS_URL_BASE}/cloudformation/home?region=${AWS_REGION}#/stacks/stackinfo?stackId=${resourceId}`;
    case "AWS::Lambda::Function":
      return `${AWS_URL_BASE}/lambda/home?region=${AWS_REGION}#/functions/${resourceId}?tab=monitoring`;
    case "AWS::Glue::JobRun":
      return `${AWS_URL_BASE}/gluestudio/home?region=eu-central-1#/job/${resourceId}/run/${runId}`;
    case "AWS::Glue::JobRuns":
      return `${AWS_URL_BASE}/gluestudio/home?region=eu-central-1#/editor/job/${resourceId}/runs`;
    case "AWS::CodePipeline::Pipeline":
      return `${AWS_URL_BASE}/codesuite/codepipeline/pipelines/${resourceId}/view?region=${AWS_REGION}`;
    case "AWS::S3::Bucket":
      return `https://s3.console.aws.amazon.com/s3/buckets/${resourceId}?region=${AWS_REGION}`;
    case "AWS::S3::Object": {
      const [bucket, ...objectKey] = resourceId.split("/");
      return `https://s3.console.aws.amazon.com/s3/object/${bucket}?&prefix=${objectKey.join("/")}`;
    }
    case "AWS::S3::BucketPolicy":
      return `https://s3.console.aws.amazon.com/s3/buckets/${resourceId}?region=${AWS_REGION}&tab=permissions`;
    case "AWS::SQS::Queue":
      return `${AWS_URL_BASE}/sqs/v2/home?region=${AWS_REGION}#/queues/${encodeURIComponent(resourceId)}`;
    case "AWS::SNS::Topic":
      return `${AWS_URL_BASE}/sns/v3/home?region=${AWS_REGION}#/topic/${resourceId}`;
    case "AWS::DynamoDB::Table":
      return `${AWS_URL_BASE}/dynamodb/home?region=${AWS_REGION}#tables:selected=${resourceId}`;
    case "AWS::StepFunctions::StateMachine":
      return `${AWS_URL_BASE}/states/home?region=${AWS_REGION}#/statemachines/view/${resourceId}`;
    default:
      return "";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sortRecord = (record: Record<string, any>): Record<string, any> =>
  Object.fromEntries(Object.entries(record).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)));

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    try {
      const parsedError = JSON.parse(error.message);
      if (parsedError.errorMessages && Array.isArray(parsedError.errorMessages)) {
        return parsedError.errorMessages[0];
      }
    } catch (e) {
      return error.message;
    }
  }

  return String(error);
};

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getEnumKeys = <T extends object>(enumType: T): (keyof T)[] => {
  return Object.keys(enumType).filter((key) => isNaN(Number(key))) as (keyof T)[];
};

export const getEnumKeysExcludingCurrent = <T extends object>(enumType: T, currentValue: T[keyof T]): (keyof T)[] => {
  return getEnumKeys(enumType).filter((key) => enumType[key] !== currentValue);
};
