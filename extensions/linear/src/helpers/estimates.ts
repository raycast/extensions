import { Issue, Team } from "@linear/sdk";

export enum EstimateType {
  notUsed = "notUsed",
  exponential = "exponential",
  fibonacci = "fibonacci",
  linear = "linear",
  tShirt = "tShirt",
}

const estimateScales: Record<string, number[]> = {
  [EstimateType.exponential]: [0, 1, 2, 4, 8, 16, 32, 64],
  [EstimateType.fibonacci]: [0, 1, 2, 3, 5, 8, 13, 21],
  [EstimateType.linear]: [0, 1, 2, 3, 4, 5, 6, 7],
  [EstimateType.tShirt]: [0, 1, 2, 3, 5, 8, 13, 21],
};

const tShirtLabels: Record<string, string> = {
  0: "–",
  1: "XS",
  2: "S",
  3: "M",
  5: "L",
  8: "XL",
  13: "XXL",
  21: "XXXL",
};

type getEstimateLabelParams = Pick<Issue, "estimate"> & Pick<Team, "issueEstimationType">;

export function getEstimateLabel({ estimate, issueEstimationType }: getEstimateLabelParams) {
  if (!estimate) {
    return "Not estimated";
  }

  if (issueEstimationType === EstimateType.tShirt) {
    const tShirtEstimate = tShirtLabels[estimate];

    // Let's return the raw estimate in case the scale changes to t-shirt sizing
    // without any modifications to the remaining estimates
    return tShirtEstimate ? tShirtEstimate : String(estimate);
  }

  return String(estimate);
}

type getEstimateScaleParams = Pick<
  Team,
  "issueEstimationType" | "issueEstimationAllowZero" | "issueEstimationExtended"
>;

export function getEstimateScale({
  issueEstimationType,
  issueEstimationAllowZero,
  issueEstimationExtended,
}: getEstimateScaleParams) {
  if (issueEstimationType === EstimateType.notUsed) {
    return null;
  }

  const startIndex = issueEstimationAllowZero ? 0 : 1;
  const endIndex = issueEstimationExtended ? estimateScales[issueEstimationType].length : 6;

  const scale = estimateScales[issueEstimationType].slice(startIndex, endIndex);

  if (issueEstimationType === EstimateType.tShirt) {
    return scale.map((estimate) => ({ estimate, label: tShirtLabels[estimate] }));
  }

  return scale.map((estimate) => ({ estimate, label: estimate !== 1 ? `${estimate} points` : `${estimate} point` }));
}
