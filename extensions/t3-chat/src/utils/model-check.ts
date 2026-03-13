export const isSearchGroundingSupported = (model: string) => {
  return model.includes("gemini");
};
