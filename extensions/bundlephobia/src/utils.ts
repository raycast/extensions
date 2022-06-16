import { PackageResultModel } from "./packageRepsonse";

const ONE_KILOBYTE = 1024;
const SLOW_3G_SPEED = 50;
const FAST_4G_SPEED = 875;

export const formatInformationOfPackage = (detailResult: PackageResultModel) => {
  const minifiedSizeInKB = detailResult ? detailResult?.size / ONE_KILOBYTE : 0;
  const minifiedGzipSizeInKB = detailResult ? detailResult?.gzip / ONE_KILOBYTE : 0;
  const timeWithSlowSpeed = detailResult ? Math.ceil(detailResult?.gzip / SLOW_3G_SPEED) : 0;
  const timeWithFastSpeed = detailResult ? Math.ceil(detailResult?.gzip / FAST_4G_SPEED) : 0;

  return { minifiedSizeInKB, minifiedGzipSizeInKB, timeWithSlowSpeed, timeWithFastSpeed };
};
