export function getTokenType(contractType: string) {
  if (contractType === "EVM_ERC721") return "ERC721";
  if (contractType === "EVM_ERC1155") return "ERC1155";
  return undefined;
}
