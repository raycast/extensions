import { ChainInfo } from "../types/api";

const sortChains = (featuredChains: Array<string>) => (chainA: ChainInfo, chainB: ChainInfo) => {
  // Check if chains are featured based on their chainId in the featuredChains array
  const isChainAFeatured = featuredChains.includes(chainA.chainId);
  const isChainBFeatured = featuredChains.includes(chainB.chainId);

  // If both are featured, sort by their index in featuredChains array
  if (isChainAFeatured && isChainBFeatured) {
    const indexA = featuredChains.indexOf(chainA.chainId);
    const indexB = featuredChains.indexOf(chainB.chainId);
    return indexA - indexB;
  }

  // If only one is featured, prioritize the featured one
  if (isChainAFeatured && !isChainBFeatured) {
    return -1; // chainA is featured, chainB is not - move A before B
  }

  if (!isChainAFeatured && isChainBFeatured) {
    return 1; // chainB is featured, chainA is not - move B before A
  }

  // If both have the same featured status, continue with ID-based sorting
  const chainIdA = Number(chainA.chainId);
  const chainIdB = Number(chainB.chainId);

  if (chainIdA === chainIdB) {
    return 0;
  }

  // Handle NaN values - sort them to the end
  if (Object.is(chainIdA, NaN) && Object.is(chainIdB, NaN)) {
    return 0;
  }

  if (Object.is(chainIdA, NaN)) {
    return 1;
  }

  if (Object.is(chainIdB, NaN)) {
    return -1;
  }

  // Normal numeric comparison
  if (chainIdA < chainIdB) {
    return -1;
  }

  return 1;
};

export default sortChains;
