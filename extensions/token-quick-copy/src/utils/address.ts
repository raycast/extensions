/**
 * Ethereum address checksumming according to EIP-55
 * Reference: https://github.com/ethereum/ercs/blob/master/ERCS/erc-55.md
 */
import createKeccakHash from "keccak";

/**
 * Converts an Ethereum address to its checksummed form according to EIP-55
 */
export function toChecksumAddress(address) {
  // Remove 0x prefix if present, and convert to lowercase
  const cleanAddress = address.toLowerCase().replace(/^0x/i, "");

  // Validate the address format
  if (!/^[0-9a-f]{40}$/i.test(cleanAddress)) {
    throw new Error("Invalid Ethereum address");
  }

  // Calculate keccak256 hash of the lowercase address
  const hash = createKeccakHash("keccak256").update(cleanAddress).digest("hex");

  // Create the checksummed address
  let checksumAddress = "0x";

  for (let i = 0; i < cleanAddress.length; i++) {
    const char = cleanAddress[i];

    // If the ith character is a letter (a-f) and the ith character in the hash is >= 8,
    // convert to uppercase; otherwise leave as is
    if (/[a-f]/.test(char)) {
      if (parseInt(hash[i], 16) >= 8) {
        checksumAddress += char.toUpperCase();
      } else {
        checksumAddress += char;
      }
    } else {
      // Digits stay as they are
      checksumAddress += char;
    }
  }

  return checksumAddress;
}
