import { IAMService, IAMPrincipal } from "../services/iam/IAMService";

export async function findPrincipal(
  principalIdentifier: string,
  iamService: IAMService,
  passedPrincipals?: IAMPrincipal[], // Optional: pass if already fetched
): Promise<IAMPrincipal | null | string> {
  const principalsToSearch = passedPrincipals || (await iamService.getIAMPrincipals());
  const lowerPrincipalIdentifier = principalIdentifier.toLowerCase().trim();

  let foundPrincipal: IAMPrincipal | undefined;

  // Priority 1: Exact match by type:id (if identifier contains ':')
  const parts = principalIdentifier.split(":");
  if (parts.length === 2) {
    const typePart = parts[0].toLowerCase();
    const idPart = parts[1].toLowerCase();
    foundPrincipal = principalsToSearch.find((p) => p.type.toLowerCase() === typePart && p.id.toLowerCase() === idPart);
  }

  // Priority 2: Exact ID match (if not found by type:id)
  if (!foundPrincipal) {
    foundPrincipal = principalsToSearch.find((p) => p.id.toLowerCase() === lowerPrincipalIdentifier);
  }

  // Priority 3: Exact email match (if not found by ID or type:id)
  // (Note: p.id might already be the email for user/SA types)
  if (!foundPrincipal) {
    foundPrincipal = principalsToSearch.find((p) => p.email?.toLowerCase() === lowerPrincipalIdentifier);
  }

  if (foundPrincipal) {
    return foundPrincipal;
  }

  // No exact match found, proceed to partial matching
  console.log(`No exact match for '${principalIdentifier}', attempting partial search.`);
  const partialMatches = principalsToSearch.filter(
    (p) =>
      p.id.toLowerCase().includes(lowerPrincipalIdentifier) ||
      (p.email && p.email.toLowerCase().includes(lowerPrincipalIdentifier)),
  );

  if (partialMatches.length === 0) {
    return null; // No principal found
  }

  if (partialMatches.length > 1) {
    let response = `Multiple principals found matching '${principalIdentifier}'. Please be more specific or use a full identifier (e.g., user:email@example.com, serviceAccount:id@project.iam.gserviceaccount.com):\n\n`;
    partialMatches.forEach((p) => {
      const displayIdentifier = p.email && p.email.toLowerCase().includes(lowerPrincipalIdentifier) ? p.email : p.id;
      response += `- ${p.type}:${displayIdentifier}\n`;
    });
    return response; // Ambiguity message
  }

  // Exactly one partial match found
  foundPrincipal = partialMatches[0];
  console.log(`Found single partial match for '${principalIdentifier}': ${foundPrincipal.type}:${foundPrincipal.id}`);
  return foundPrincipal;
}
